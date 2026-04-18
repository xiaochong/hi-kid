import fs from 'fs'
import path from 'path'
import https from 'https'
import http from 'http'

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

function downloadFile(
  model: ModelFile,
  onProgress: (downloaded: number, total: number) => void
): Promise<void> {
  return new Promise((resolve, reject) => {
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

    const url = new URL(model.url)
    const client = url.protocol === 'https:' ? https : http

    const headers: Record<string, string> = {}
    if (startByte > 0) {
      headers['Range'] = `bytes=${startByte}-`
    }

    const req = client.get(url, { headers }, (res) => {
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

      res.on('data', (chunk: Buffer) => {
        downloaded += chunk.length
        onProgress(downloaded, total)
      })

      res.pipe(fileStream)

      fileStream.on('finish', () => {
        fileStream.close()
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

    req.setTimeout(30000, () => {
      req.destroy()
      reject(new Error(`Timeout downloading ${model.name}`))
    })
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
  onProgress: (progress: DownloadProgress) => void
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

  // Calculate total size
  for (const model of modelsToDownload) {
    const partPath = `${model.localPath}.part`
    let downloaded = 0
    if (fs.existsSync(partPath)) {
      const stats = fs.statSync(partPath)
      downloaded = stats.size
    } else if (fs.existsSync(model.localPath)) {
      const stats = fs.statSync(model.localPath)
      downloaded = stats.size
    }
    totalBytes += model.size || 0
    downloadedBytes += downloaded
  }

  if (totalBytes === 0) {
    totalBytes = modelsToDownload.length // Avoid division by zero
  }

  onProgress({ bytes: downloadedBytes, total: totalBytes, currentFile: 'Starting...' })

  for (const model of modelsToDownload) {
    if (fs.existsSync(model.localPath)) {
      continue
    }

    onProgress({ bytes: downloadedBytes, total: totalBytes, currentFile: model.name })

    let retries = 0
    const maxRetries = 2

    while (retries < maxRetries) {
      try {
        await downloadFile(model, (fileDownloaded) => {
          const currentTotal = downloadedBytes + fileDownloaded
          onProgress({
            bytes: currentTotal,
            total: totalBytes,
            currentFile: model.name
          })
        })

        // Add the full file size to downloaded bytes
        const fileSize = model.size || 0
        downloadedBytes += fileSize
        break
      } catch (err) {
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

  onProgress({ bytes: totalBytes, total: totalBytes, currentFile: 'Complete!' })
}
