import type {
  IRouterMatcher,
  RequestHandler,
  ErrorRequestHandler,
  PathParams,
} from 'express-serve-static-core'

// ── internal: shape of the Rust NAPI methods ─────────────────────────────────
// Handlers arrive pre-classified from the dispatch below, so each vec carries a
// concrete typed signature — no runtime probing or unsafe casting needed in Rust.

interface NativeApp {
  getWithHandler(
    path: string,
    handlers: Array<RequestHandler>,
  ): void
  getWithMixedHandlers(
    path: string,
    normalHandlers: Array<RequestHandler>,
    errorHandlers: Array<ErrorRequestHandler>,
    order: boolean[],
  ): void
  getWithPathParams(
    path: string[],
    handlers: Array<RequestHandler>,
  ): void
  getWithPathParamsMixed(
    path: string[],
    normalHandlers: Array<RequestHandler>,
    errorHandlers: Array<ErrorRequestHandler>,
    order: boolean[],
  ): void
  getWithSubApp(path: string, subApp: NativeApp): void
}

// eslint-disable-next-line @typescript-eslint/no-require-imports
const native = require('./_binding') as unknown as {
  Application: new () => NativeApp
}

// ── public type ───────────────────────────────────────────────────────────────

export type IRouterPartial = {
  get: IRouterMatcher<IRouterPartial, 'get'>
}

// ── internal wrapper class — NOT exported ─────────────────────────────────────

class Application implements IRouterPartial {
  // True private field: consumers cannot reach NAPI methods even at runtime.
  readonly #native: NativeApp = new native.Application()

  get: IRouterMatcher<IRouterPartial, 'get'> = ((
    path: PathParams,
    ...args: unknown[]
  ) => {
    // Overload 5 — sub-application mounting
    if (args.length === 1 && args[0] instanceof Application) {
      this.#native.getWithSubApp(String(path), (args[0] as Application).#native)
      return this
    }

    const handlers = args as Array<RequestHandler | ErrorRequestHandler>
    const pathIsArray = Array.isArray(path)

    // Express allows interleaving normal handlers (req, res, next) and error
    // handlers (err, req, res, next) in a single .get() call. NAPI-RS cannot
    // express a heterogeneous array across the FFI boundary, so we split the
    // flat handlers array into two typed arrays before crossing into Rust.
    //
    // normalHandlers — handlers with arity < 4; receive (req, res, next).
    // errorHandlers  — handlers with arity === 4; receive (err, req, res, next).
    // order          — parallel bool[] mirroring the original handlers array;
    //                  true = the slot was an error handler, false = normal.
    //                  Rust uses this as a zipper to reconstruct the original
    //                  interleaved dispatch sequence from the two typed arrays.
    // hasError       — set to true if any error handler is found; used below to
    //                  pick the correct Rust overload (mixed vs. normal-only).
    const normalHandlers: RequestHandler[]      = []
    const errorHandlers:  ErrorRequestHandler[] = []
    const order:          boolean[]             = []
    let   hasError = false

    for (const h of handlers) {
      if (h.length === 4) {
        hasError = true
        order.push(true)
        errorHandlers.push(h as ErrorRequestHandler)
      } else {
        order.push(false)
        normalHandlers.push(h as RequestHandler)
      }
    }

    if (!pathIsArray && !hasError) {
      this.#native.getWithHandler(String(path), normalHandlers)                              // Overload 1
    } else if (!pathIsArray && hasError) {
      this.#native.getWithMixedHandlers(String(path), normalHandlers, errorHandlers, order)  // Overload 2
    } else if (pathIsArray && !hasError) {
      this.#native.getWithPathParams(path as string[], normalHandlers)                        // Overload 3
    } else {
      this.#native.getWithPathParamsMixed(path as string[], normalHandlers, errorHandlers, order) // Overload 4
    }

    return this
  }) as IRouterMatcher<IRouterPartial, 'get'>
}

// ── public factory ────────────────────────────────────────────────────────────

export function createApp(): IRouterPartial {
  return new Application()
}

// Re-export Request and Response from the native binding so consumers get the
// actual NAPI-backed classes while only importing from this module.
export { Request, Response } from './_binding'
