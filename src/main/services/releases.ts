import path from 'path'

const KITTEN_TAG = 'v0.2.2'
const ASR_TAG = 'v0.2.0'

export interface DirectDownload {
  name: string
  url: string
  size: number
  localPath: string
  executable?: boolean
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

export interface InstallManifest {
  directDownloads: DirectDownload[]
  archives: ArchiveDownload[]
}

export function getInstallManifest(binDir: string, modelsDir: string): InstallManifest {
  return {
    directDownloads: [
      {
        name: 'ASR Model Config',
        url: 'https://huggingface.co/Qwen/Qwen3-ASR-0.6B/resolve/main/config.json',
        size: 1347,
        localPath: path.join(modelsDir, 'qwen3_asr_rs', 'Qwen3-ASR-0.6B', 'config.json')
      },
      {
        name: 'ASR Model Weights',
        url: 'https://huggingface.co/Qwen/Qwen3-ASR-0.6B/resolve/main/model.safetensors',
        size: 1876091704,
        localPath: path.join(modelsDir, 'qwen3_asr_rs', 'Qwen3-ASR-0.6B', 'model.safetensors')
      }
    ],
    archives: [
      {
        name: 'TTS Server',
        url: `https://github.com/second-state/kitten_tts_rs/releases/download/${KITTEN_TAG}/kitten-tts-aarch64-macos.tar.gz`,
        size: 18098320,
        type: 'tar.gz',
        entries: [
          {
            archivePath: 'kitten-tts-aarch64-macos/kitten-tts-server',
            localPath: path.join(binDir, 'kitten-tts-server'),
            executable: true
          }
        ]
      },
      {
        name: 'TTS Model',
        url: `https://github.com/second-state/kitten_tts_rs/releases/download/${KITTEN_TAG}/kitten-tts-models.tar.gz`,
        size: 174444603,
        type: 'tar.gz',
        entries: [
          {
            archivePath: 'models/kitten-tts-micro',
            localPath: path.join(modelsDir, 'kitten', 'kitten-tts-micro')
          }
        ]
      },
      {
        name: 'ASR Server & Assets',
        url: `https://github.com/second-state/qwen3_asr_rs/releases/download/${ASR_TAG}/asr-macos-aarch64.zip`,
        size: 49211615,
        type: 'zip',
        entries: [
          {
            archivePath: 'asr-macos-aarch64/asr-server',
            localPath: path.join(binDir, 'asr-server'),
            executable: true
          },
          {
            archivePath: 'asr-macos-aarch64/mlx.metallib',
            localPath: path.join(binDir, 'mlx.metallib')
          },
          {
            archivePath: 'asr-macos-aarch64/tokenizers/tokenizer-0.6B.json',
            localPath: path.join(modelsDir, 'qwen3_asr_rs', 'Qwen3-ASR-0.6B', 'tokenizer.json')
          }
        ]
      }
    ]
  }
}
