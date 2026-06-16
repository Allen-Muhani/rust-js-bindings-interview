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
  // Handlers arrive opaque because a Vec can't hold two different concrete function
  // types. We probe .length at runtime to tell them apart, then reinterpret the raw
  // napi value as the correct typed Function before invocation.
  #[napi]
  pub fn get_with_mixed_handlers(
    &self,
    _path: String,
    handlers: Vec<Function<'_>>,
  ) -> napi::Result<&Self> {
    for handler in &handlers {
      let arity: f64 = handler.get_named_property("length")?;
      let v = handler.value();
      if arity as u32 == 4 {
        // Error handler: (err, req, res, next) => void
        // err is Unknown<'_> because Express makes no guarantee about its shape —
        // callers may pass a JS Error object, a plain string, a number, or null.
        let _typed: Function<
          '_,
          FnArgs<(Unknown<'_>, ClassInstance<Request>, ClassInstance<Response>, Function<'_>)>,
          (),
        > = unsafe { Function::from_napi_value(v.env, v.value) }?;
        // _typed.call((err, req, res, next))? — once those values are in scope
      } else {
        // Normal handler: (req, res, next) => void
        let _typed: Function<
          '_,
          FnArgs<(ClassInstance<Request>, ClassInstance<Response>, Function<'_>)>,
          (),
        > = unsafe { Function::from_napi_value(v.env, v.value) }?;
        // _typed.call((req, res, next))? — once those values are in scope
      }
    }
    Ok(self)
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
  // Same arity-probe dispatch as overload 2 — see get_with_mixed_handlers.
  #[napi]
  pub fn get_with_path_params_mixed(
    &self,
    _path: Vec<String>,
    handlers: Vec<Function<'_>>,
  ) -> napi::Result<&Self> {
    for handler in &handlers {
      let arity: f64 = handler.get_named_property("length")?;
      let v = handler.value();
      if arity as u32 == 4 {
        // err is Unknown<'_> — see get_with_mixed_handlers for the full reasoning.
        let _typed: Function<
          '_,
          FnArgs<(Unknown<'_>, ClassInstance<Request>, ClassInstance<Response>, Function<'_>)>,
          (),
        > = unsafe { Function::from_napi_value(v.env, v.value) }?;
      } else {
        let _typed: Function<
          '_,
          FnArgs<(ClassInstance<Request>, ClassInstance<Response>, Function<'_>)>,
          (),
        > = unsafe { Function::from_napi_value(v.env, v.value) }?;
      }
    }
    Ok(self)
  }

  // Overload 5 — string path + a sub-application (another Application instance).
  // e.g. app.get('/users', usersApp)
  // The JS bridge always calls String(path) before passing here.
  #[napi]
  pub fn get_with_sub_app(&self, _path: String, _sub_app: &Application) -> &Self {
    self
  }
}
