#![deny(clippy::all)]

use napi::bindgen_prelude::*;
use napi_derive::napi;
use std::collections::HashMap;

#[napi]
pub struct Request {
  pub method: String,
  pub path: String,
  // Private: exposed via getter because &mut HashMap doesn't impl JsValue
  params: HashMap<String, String>,
}

#[napi]
impl Request {
  #[napi(constructor)]
  pub fn new(method: String, path: String) -> Self {
    Request { method, path, params: HashMap::new() }
  }

  #[napi(getter)]
  pub fn params(&self) -> HashMap<String, String> {
    self.params.clone()
  }
}

#[napi]
pub struct Response {
  pub status_code: u16,
}

#[napi]
impl Response {
  #[napi(constructor)]
  pub fn new() -> Self {
    Response { status_code: 200 }
  }

  // Returns () rather than &mut Self — napi can't resolve Self in generated wrapper code.
  // The TypeScript declaration still advertises `status(code): this` for chaining.
  #[napi]
  pub fn status(&mut self, code: u16) {
    self.status_code = code;
  }

  #[napi]
  pub fn send(&self, _body: String) {}
}

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
  pub fn get_with_handler(
    &self,
    _path: String,
    _handlers: Vec<Function<'_, FnArgs<(ClassInstance<Request>, ClassInstance<Response>, Function<'_>)>, ()>>,
  ) -> &Self {
    self
  }

  // Overload 2 — typed route string + mixed RequestHandler / ErrorRequestHandler.
  // e.g. app.get('/users/:id', normalHandler, errorHandler)
  // The JS bridge pre-classifies handlers by arity before crossing the NAPI boundary,
  // so each vec arrives with a concrete typed signature — no runtime probing needed.
  #[napi]
  pub fn get_with_mixed_handlers(
    &self,
    _path: String,
    _normal_handlers: Vec<Function<'_, FnArgs<(ClassInstance<Request>, ClassInstance<Response>, Function<'_>)>, ()>>,
    _error_handlers: Vec<Function<'_, FnArgs<(Unknown<'_>, ClassInstance<Request>, ClassInstance<Response>, Function<'_>)>, ()>>,
    _order: Vec<bool>,
  ) -> &Self {
    self
  }

  // Overload 3 — PathParams array + normal handlers.
  // e.g. app.get(['/users', '/people'], handler)
  // The JS bridge only calls this when Array.isArray(path) is true.
  #[napi]
  pub fn get_with_path_params(
    &self,
    _path: Vec<String>,
    _handlers: Vec<Function<'_, FnArgs<(ClassInstance<Request>, ClassInstance<Response>, Function<'_>)>, ()>>,
  ) -> &Self {
    self
  }

  // Overload 4 — PathParams array + mixed RequestHandler / ErrorRequestHandler.
  // e.g. app.get(['/users', '/people'], normalHandler, errorHandler)
  // Same pre-classified pattern as overload 2 — see get_with_mixed_handlers.
  #[napi]
  pub fn get_with_path_params_mixed(
    &self,
    _path: Vec<String>,
    _normal_handlers: Vec<Function<'_, FnArgs<(ClassInstance<Request>, ClassInstance<Response>, Function<'_>)>, ()>>,
    _error_handlers: Vec<Function<'_, FnArgs<(Unknown<'_>, ClassInstance<Request>, ClassInstance<Response>, Function<'_>)>, ()>>,
    _order: Vec<bool>,
  ) -> &Self {
    self
  }

  // Overload 5 — string path + a sub-application (another Application instance).
  // e.g. app.get('/users', usersApp)
  // The JS bridge always calls String(path) before passing here.
  #[napi]
  pub fn get_with_sub_app(&self, _path: String, _sub_app: &Application) -> &Self {
    self
  }
}
