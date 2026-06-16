import type { IRouterMatcher } from 'express-serve-static-core'

/**
 * Minimal interface requiring only the GET method from Express's router.
 * IRouterMatcher<IRouterPartial, 'get'> expands to 5 overloaded call signatures,
 * each returning IRouterPartial to allow chaining.
 */
export type IRouterPartial = {
  get: IRouterMatcher<IRouterPartial, 'get'>
}

/**
 * A native Rust-backed HTTP application class exposing Express-compatible
 * GET route registration.
 * @example
 * const app = new Application()
 *
 * // Overload 1 — typed route string + normal handler
 * typed route string + RequestHandler[]
 * app.get('/users/:id', (req, res, next) => { ... })
 *
 * // Overload 2 — typed route string + error handler in chain
 * typed route string + RequestHandlerParams[] (includes error handlers)
 * app.get('/users/:id', handler, (err, req, res, next) => { ... })
 *
 * // Overload 3 — array of paths + normal handler
 * PathParams (string | RegExp | Array) + RequestHandler[]
 * app.get(['/users', '/people'], (req, res, next) => { ... })
 *
 * // Overload 4 — array of paths + error handler in chain
 * PathParams + RequestHandlerParams[]
 * app.get(['/users', '/people'], handler, (err, req, res, next) => { ... })
 *
 * // Overload 5 — mount a sub-application
 * PathParams + sub-Application (for mounting nested apps)
 * app.get('/users', new Application())
 */
export declare class Application implements IRouterPartial {
  constructor()

  /**
   * Registers one or more handlers for GET requests matching the given path.
   *
   * Dispatches to the correct native Rust method based on the runtime shape
   * of the arguments. See the class-level JSDoc for the full list of overloads.
   */
  get: IRouterMatcher<Application, 'get'>
}
