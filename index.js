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

const { Application, Request, Response } = nativeBinding

/**
 * Registers one or more handlers for GET requests matching the given path.
 *
 * Dispatches to the correct native Rust method based on the runtime shape of
 * the arguments, mirroring the 5 IRouterMatcher overloads from Express:
 *
 *   Overload 1 — string path + RequestHandler[]
 *   Overload 2 — string path + RequestHandlerParams[] (includes error handlers)
 *   Overload 3 — PathParams (array/RegExp) + RequestHandler[]
 *   Overload 4 — PathParams + RequestHandlerParams[]
 *   Overload 5 — path + sub-Application (mount a nested app)
 *
 * @param {string|string[]|RegExp} path  Route path or path-params array.
 * @param {...Function|Application}  handlers  One or more handler functions, or
 *   a single Application instance for sub-app mounting (Overload 5).
 * @returns {Application} The application instance, for chaining.
 */
nativeBinding.Application.prototype.get = function get(path, ...handlers) {
  // Overload 5 — sub-application mounting
  if (handlers.length === 1 && handlers[0] instanceof nativeBinding.Application) {
    this.getWithSubApp(String(path), handlers[0])
    return this
  }

  // Error handlers have arity 4: (err, req, res, next)
  const hasErrorHandler = handlers.some((h) => typeof h === 'function' && h.length === 4)
  // PathParams allows arrays; a single string or RegExp maps to overloads 1/2
  const pathIsArray = Array.isArray(path)

  if (!pathIsArray && !hasErrorHandler) {
    this.getWithHandler(String(path), handlers)       // Overload 1 — literal path, RequestHandler[]
  } else if (!pathIsArray && hasErrorHandler) {
    this.getWithMixedHandlers(String(path), handlers) // Overload 2 — literal path, RequestHandlerParams[]
  } else if (pathIsArray && !hasErrorHandler) {
    this.getWithPathParams(path, handlers)            // Overload 3 — PathParams, RequestHandler[]
  } else {
    this.getWithPathParamsMixed(path, handlers)       // Overload 4 — PathParams, RequestHandlerParams[]
  }

  return this
}

module.exports.Application = Application
module.exports.Request = Request
module.exports.Response = Response
