#![deny(clippy::all)]

use napi::bindgen_prelude::*;
use napi::JsFunction;
use napi_derive::napi;

// Stub types — exist only to satisfy the type signatures of the get overloads.
// No fields or behaviour are needed for this exercise.
#[napi]
pub struct Request {}

#[napi]
pub struct Response {}

// The Application struct mirrors the TypeScript Application type.
// Each get_* method below corresponds to one of the 5 IRouterMatcher overloads.
#[napi]
pub struct Application {}

#[napi]
impl Application {
  #[napi(constructor)]
  pub fn new() -> Self {
    Application {}
  }

  // Overload 1 — typed route string + one or more normal RequestHandlers.
  // e.g. app.get('/users/:id', (req, res, next) => { ... })
  #[napi]
  pub fn get_with_handler(&self, _path: String, _handlers: Vec<JsFunction>) -> &Self {
    self
  }

  // Overload 2 — typed route string + mixed RequestHandler / ErrorRequestHandler.
  // e.g. app.get('/users/:id', normalHandler, errorHandler)
  // Rust can't distinguish handler arity at runtime so we accept all as JsFunction
  // and rely on the TypeScript layer to enforce the correct signatures.
  #[napi]
  pub fn get_with_mixed_handlers(&self, _path: String, _handlers: Vec<JsFunction>) -> &Self {
    self
  }

  // Overload 3 — PathParams (string | RegExp | Array<string | RegExp>) + normal handlers.
  // e.g. app.get(['/users', '/people'], handler)
  // PathParams is represented as a JS unknown value since it can be a string,
  // RegExp object, or array — we let the JS side pass it through untyped.
  #[napi]
  pub fn get_with_path_params(&self, _path: Unknown, _handlers: Vec<JsFunction>) -> &Self {
    self
  }

  // Overload 4 — PathParams + mixed RequestHandler / ErrorRequestHandler.
  // e.g. app.get(['/users', '/people'], normalHandler, errorHandler)
  #[napi]
  pub fn get_with_path_params_mixed(
    &self,
    _path: Unknown,
    _handlers: Vec<JsFunction>,
  ) -> &Self {
    self
  }

  // Overload 5 — PathParams + a sub-application (another Application instance).
  // e.g. app.get('/users', usersApp)
  // Used to mount a nested Application at a given path.
  #[napi]
  pub fn get_with_sub_app(&self, _path: Unknown, _sub_app: &Application) -> &Self {
    self
  }
}
