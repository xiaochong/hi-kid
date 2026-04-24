const fs = require('fs')
const path = require('path')

const home = process.env.HOME || ''
const srcBin = path.join(home, '.config', 'hi-kid', 'bin')
const srcModels = path.join(home, '.config', 'hi-kid', 'models')
const destBin = path.join(__dirname, '..', 'resources', 'bin')
const destModels = path.join(__dirname, '..', 'resources', 'models')

/**
 * Recursively copy a directory.
 * @param {string} src - Source directory path
 * @param {string} dest - Destination directory path
 * @returns {void}
 */
function copyDir(src, dest) {
  if (!fs.existsSync(src)) {
    console.error(`Source not found: ${src}`)
    process.exit(1)
  }
  fs.mkdirSync(dest, { recursive: true })
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const srcPath = path.join(src, entry.name)
    const destPath = path.join(dest, entry.name)
    if (entry.isDirectory()) {
      copyDir(srcPath, destPath)
    } else {
      fs.copyFileSync(srcPath, destPath)
    }
  }
}

console.log('Copying binaries...')
copyDir(srcBin, destBin)

console.log('Copying models...')
copyDir(srcModels, destModels)

console.log('Done. Ready for bundled build.')
