const { existsSync, readFileSync } = require('fs')
const { join } = require('path')

const { platform, arch } = process

let nativeBinding = null
let localFileExisted = false
let loadError = null

function isMusl() {
  if (!existsSync('/usr/bin/ldd')) {
    return true
  }
  return readFileSync('/usr/bin/ldd', 'utf8').includes('musl')
}

switch (platform) {
  case 'linux':
    switch (arch) {
      case 'x64':
        localFileExisted = existsSync(join(__dirname, 'rust-js-bindings.linux-x64-gnu.node'))
        try {
          if (localFileExisted) {
            nativeBinding = require('./rust-js-bindings.linux-x64-gnu.node')
          } else {
            nativeBinding = require('@rust-js-bindings/linux-x64-gnu')
          }
        } catch (e) {
          loadError = e
        }
        break
      case 'arm64':
        localFileExisted = existsSync(join(__dirname, 'rust-js-bindings.linux-arm64-gnu.node'))
        try {
          if (localFileExisted) {
            nativeBinding = require('./rust-js-bindings.linux-arm64-gnu.node')
          } else {
            nativeBinding = require('@rust-js-bindings/linux-arm64-gnu')
          }
        } catch (e) {
          loadError = e
        }
        break
      default:
        throw new Error(`Unsupported architecture on Linux: ${arch}`)
    }
    break
  case 'darwin':
    switch (arch) {
      case 'x64':
        localFileExisted = existsSync(join(__dirname, 'rust-js-bindings.darwin-x64.node'))
        try {
          if (localFileExisted) {
            nativeBinding = require('./rust-js-bindings.darwin-x64.node')
          } else {
            nativeBinding = require('@rust-js-bindings/darwin-x64')
          }
        } catch (e) {
          loadError = e
        }
        break
      case 'arm64':
        localFileExisted = existsSync(join(__dirname, 'rust-js-bindings.darwin-arm64.node'))
        try {
          if (localFileExisted) {
            nativeBinding = require('./rust-js-bindings.darwin-arm64.node')
          } else {
            nativeBinding = require('@rust-js-bindings/darwin-arm64')
          }
        } catch (e) {
          loadError = e
        }
        break
      default:
        throw new Error(`Unsupported architecture on macOS: ${arch}`)
    }
    break
  case 'win32':
    switch (arch) {
      case 'x64':
        localFileExisted = existsSync(join(__dirname, 'rust-js-bindings.win32-x64-msvc.node'))
        try {
          if (localFileExisted) {
            nativeBinding = require('./rust-js-bindings.win32-x64-msvc.node')
          } else {
            nativeBinding = require('@rust-js-bindings/win32-x64-msvc')
          }
        } catch (e) {
          loadError = e
        }
        break
      default:
        throw new Error(`Unsupported architecture on Windows: ${arch}`)
    }
    break
  default:
    throw new Error(`Unsupported OS: ${platform}, architecture: ${arch}`)
}

if (!nativeBinding) {
  if (loadError) {
    throw loadError
  }
  throw new Error('Failed to load native binding')
}

const { sum } = nativeBinding

module.exports.sum = sum
