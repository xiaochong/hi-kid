import fs from 'fs'
import path from 'path'
import https from 'https'
import http from 'http'
import { spawn } from 'child_process'
import os from 'os'

export interface ModelFile {
  name: string
  url: string
  localPath: string
  size?: number
  sha256?: string
  executable?: boolean
}

export interface DownloadConfig {
  models: ModelFile[]
  userDataPath: string
}

export interface DownloadProgress {
  bytes: number
  total: number
  currentFile: string
}

export interface ArchiveEntry {
  archivePath: string
  localPath: string
  executable?: boolean
}

export interface ArchiveDownload {
  name: string
  url: string
  size: number
  type: 'tar.gz' | 'zip'
  entries: ArchiveEntry[]
}

interface ResumeMeta {
  url: string
  localPath: string
  downloaded: number
  total: number
  lastModified: string
}

function ensureDir(dir: string): void {
  fs.mkdirSync(dir, { recursive: true })
}

function getMetaPath(partPath: string): string {
  return `${partPath}.meta.json`
}

function readMeta(partPath: string): ResumeMeta | null {
  try {
    const metaPath = getMetaPath(partPath)
    if (!fs.existsSync(metaPath)) return null
    const data = fs.readFileSync(metaPath, 'utf-8')
    return JSON.parse(data) as ResumeMeta
  } catch {
    return null
  }
}

function writeMeta(partPath: string, meta: ResumeMeta): void {
  try {
    fs.writeFileSync(getMetaPath(partPath), JSON.stringify(meta, null, 2))
  } catch {
    // ignore
  }
}

function deleteMeta(partPath: string): void {
  try {
    const metaPath = getMetaPath(partPath)
    if (fs.existsSync(metaPath)) {
      fs.unlinkSync(metaPath)
    }
  } catch {
    // ignore
  }
}

export function downloadFile(
  model: ModelFile,
  onProgress: (downloaded: number, total: number) => void,
  signal?: AbortSignal
): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new Error('Download aborted'))
      return
    }

    const partPath = `${model.localPath}.part`
    ensureDir(path.dirname(partPath))

    const meta = readMeta(partPath)
    let startByte = 0

    if (meta && meta.url === model.url && fs.existsSync(partPath)) {
      const stats = fs.statSync(partPath)
      startByte = stats.size
      if (meta.total > 0 && startByte >= meta.total) {
        // Already complete
        fs.renameSync(partPath, model.localPath)
        deleteMeta(partPath)
        onProgress(startByte, meta.total)
        resolve()
        return
      }
    }

    const headers: Record<string, string> = {}
    if (startByte > 0) {
      headers['Range'] = `bytes=${startByte}-`
    }

    function doRequest(
      requestUrl: string,
      requestHeaders: Record<string, string>,
      redirectCount: number
    ): void {
      if (redirectCount > 5) {
        reject(new Error(`Too many redirects for ${model.name}`))
        return
      }

      const url = new URL(requestUrl)
      const client = url.protocol === 'https:' ? https : http

      const req = client.get(url, { headers: requestHeaders }, (res) => {
        if (
          res.statusCode === 301 ||
          res.statusCode === 302 ||
          res.statusCode === 303 ||
          res.statusCode === 307 ||
          res.statusCode === 308
        ) {
          const location = res.headers.location
          if (!location) {
            reject(new Error(`HTTP ${res.statusCode} missing Location for ${model.name}`))
            return
          }
          // Follow redirect; keep Range header for 307/308, drop for 301/302/303
          const nextHeaders: Record<string, string> =
            res.statusCode === 307 || res.statusCode === 308 ? { ...requestHeaders } : {}
          const nextUrl = new URL(location, requestUrl).href
          doRequest(nextUrl, nextHeaders, redirectCount + 1)
          return
        }

        if (res.statusCode !== 200 && res.statusCode !== 206) {
          reject(new Error(`HTTP ${res.statusCode} for ${model.name}`))
          return
        }

        const contentRange = res.headers['content-range']
        const contentLength = res.headers['content-length']

        let total = model.size || 0
        if (contentRange) {
          const match = contentRange.match(/\/([0-9]+)$/)
          if (match) total = parseInt(match[1], 10)
        } else if (contentLength) {
          total = parseInt(contentLength, 10) + startByte
        }

        const flags = startByte > 0 ? 'a' : 'w'
        const fileStream = fs.createWriteStream(partPath, { flags })

        let downloaded = startByte

        const abortHandler = (): void => {
          req.destroy()
          fileStream.destroy()
          reject(new Error('Download aborted'))
        }
        signal?.addEventListener('abort', abortHandler, { once: true })

        res.on('data', (chunk: Buffer) => {
          downloaded += chunk.length
          onProgress(downloaded, total)
        })

        res.pipe(fileStream)

        fileStream.on('finish', () => {
          fileStream.close()
          signal?.removeEventListener('abort', abortHandler)
          if (total > 0 && downloaded < total) {
            writeMeta(partPath, {
              url: model.url,
              localPath: model.localPath,
              downloaded,
              total,
              lastModified: res.headers['last-modified'] || new Date().toISOString()
            })
            reject(new Error(`Incomplete download for ${model.name}`))
            return
          }

          try {
            fs.renameSync(partPath, model.localPath)
            if (model.executable) {
              fs.chmodSync(model.localPath, 0o755)
            }
            deleteMeta(partPath)
            resolve()
          } catch (err) {
            reject(err)
          }
        })

        fileStream.on('error', (err) => {
          signal?.removeEventListener('abort', abortHandler)
          writeMeta(partPath, {
            url: model.url,
            localPath: model.localPath,
            downloaded,
            total,
            lastModified: res.headers['last-modified'] || new Date().toISOString()
          })
          reject(err)
        })
      })

      req.on('error', (err) => {
        reject(err)
      })

      req.setTimeout(120000, () => {
        req.destroy()
        reject(new Error(`Timeout downloading ${model.name}`))
      })
    }

    doRequest(model.url, headers, 0)
  })
}

export function checkModelsExist(config: DownloadConfig): boolean {
  for (const model of config.models) {
    if (!fs.existsSync(model.localPath)) {
      return false
    }
  }
  return true
}

export async function downloadModels(
  config: DownloadConfig,
  onProgress: (progress: DownloadProgress) => void,
  signal?: AbortSignal
): Promise<void> {
  // Filter out models with no download URL (local-only checks)
  const modelsToDownload = config.models.filter((m) => m.url)

  // If nothing to download, mark as complete
  if (modelsToDownload.length === 0) {
    onProgress({ bytes: 1, total: 1, currentFile: 'Complete!' })
    return
  }

  let totalBytes = 0
  let downloadedBytes = 0

  // Calculate total size; only count fully-downloaded files to avoid
  // double-counting with downloadFile's resume progress.
  for (const model of modelsToDownload) {
    totalBytes += model.size || 0
    if (fs.existsSync(model.localPath)) {
      downloadedBytes += model.size || 0
    }
  }

  if (totalBytes === 0) {
    totalBytes = modelsToDownload.length // Avoid division by zero
  }

  onProgress({ bytes: downloadedBytes, total: totalBytes, currentFile: 'Starting...' })

  for (const model of modelsToDownload) {
    if (signal?.aborted) break
    if (fs.existsSync(model.localPath)) {
      continue
    }

    onProgress({ bytes: downloadedBytes, total: totalBytes, currentFile: model.name })

    let retries = 0
    const maxRetries = 2

    while (retries < maxRetries) {
      try {
        await downloadFile(
          model,
          (fileDownloaded) => {
            const currentTotal = downloadedBytes + fileDownloaded
            onProgress({
              bytes: currentTotal,
              total: totalBytes,
              currentFile: model.name
            })
          },
          signal
        )

        // Add the full file size to downloaded bytes
        const fileSize = model.size || 0
        downloadedBytes += fileSize
        break
      } catch (err) {
        if (signal?.aborted) {
          throw new Error(`Download cancelled for ${model.name}`)
        }
        retries++
        if (retries >= maxRetries) {
          throw new Error(
            `Failed to download ${model.name} after ${maxRetries} attempts: ${err instanceof Error ? err.message : String(err)}`
          )
        }
        // Wait before retry
        await new Promise((r) => setTimeout(r, 3000))
      }
    }
  }

  if (!signal?.aborted) {
    onProgress({ bytes: totalBytes, total: totalBytes, currentFile: 'Complete!' })
  }
}

async function extractTarEntry(
  archivePath: string,
  entryPath: string,
  targetDir: string
): Promise<void> {
  return new Promise((resolve, reject) => {
    const proc = spawn('tar', ['-xzf', archivePath, '-C', targetDir, entryPath])
    proc.on('close', (code) => {
      if (code === 0) resolve()
      else reject(new Error(`tar exited with code ${code}`))
    })
    proc.on('error', reject)
  })
}

async function extractZipEntry(
  archivePath: string,
  entryPath: string,
  targetDir: string
): Promise<void> {
  return new Promise((resolve, reject) => {
    const proc = spawn('unzip', ['-o', archivePath, entryPath, '-d', targetDir])
    proc.on('close', (code) => {
      if (code === 0) resolve()
      else reject(new Error(`unzip exited with code ${code}`))
    })
    proc.on('error', reject)
  })
}

export async function downloadAndExtractArchives(
  archives: ArchiveDownload[],
  onProgress: (bytes: number, total: number, currentFile: string) => void,
  signal?: AbortSignal
): Promise<void> {
  for (const archive of archives) {
    if (signal?.aborted) break

    const tempDir = path.join(
      os.tmpdir(),
      `hikid-archive-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    )
    const archivePath = path.join(
      tempDir,
      `archive.${archive.type === 'tar.gz' ? 'tar.gz' : 'zip'}`
    )

    try {
      // Download archive
      ensureDir(tempDir)
      await downloadFile(
        {
          name: archive.name,
          url: archive.url,
          localPath: archivePath,
          size: archive.size
        },
        (fileDownloaded, total) => {
          onProgress(fileDownloaded, total, archive.name)
        },
        signal
      )

      if (signal?.aborted) break

      // Extract entries
      for (const entry of archive.entries) {
        if (signal?.aborted) break

        ensureDir(path.dirname(entry.localPath))

        if (archive.type === 'tar.gz') {
          await extractTarEntry(archivePath, entry.archivePath, tempDir)
        } else {
          await extractZipEntry(archivePath, entry.archivePath, tempDir)
        }

        const extractedPath = path.join(tempDir, entry.archivePath)
        if (!fs.existsSync(extractedPath)) {
          throw new Error(`Expected file not found in archive: ${entry.archivePath}`)
        }

        if (fs.existsSync(entry.localPath)) {
          fs.rmSync(entry.localPath, { recursive: true, force: true })
        }
        fs.renameSync(extractedPath, entry.localPath)

        if (entry.executable) {
          fs.chmodSync(entry.localPath, 0o755)
        }
      }
    } finally {
      // Clean up temp dir
      if (fs.existsSync(tempDir)) {
        fs.rmSync(tempDir, { recursive: true, force: true })
      }
    }
  }
}
