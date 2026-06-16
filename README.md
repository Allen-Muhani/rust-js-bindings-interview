# rust-js-bindings

A Node.js native addon built with Rust and [NAPI-RS](https://napi.rs), demonstrating how to bridge complex TypeScript type definitions — specifically Express's overloaded `IRouterMatcher` interface — to a Rust implementation exposed via Node-API.

---

## Overview

The goal of this project is to implement an `Application` class in Rust that satisfies the `IRouterPartial` interface from Express:

```ts
import type { IRouterMatcher } from 'express-serve-static-core'

type IRouterPartial = {
  get: IRouterMatcher<IRouterPartial, 'get'>
}
```

`IRouterMatcher<T, 'get'>` expands to **5 overloaded call signatures** for the `get` method. The challenge is that TypeScript overloads are a compile-time concept — Rust must provide a concrete implementation for each variant since it monomorphizes code at compile time and has no concept of function overloading.

---

## The 5 Overloads

When `T = Application` and `Method = 'get'`, the 5 signatures are:

| # | Path type | Handler type | Use case |
|---|---|---|---|
| 1 | `string \| RegExp` (typed) | `RequestHandler[]` | Standard route with typed params |
| 2 | `string \| RegExp` (typed) | `RequestHandlerParams[]` | Route with mixed normal + error handlers |
| 3 | `PathParams` (string \| RegExp \| Array) | `RequestHandler[]` | Regex or multi-path route |
| 4 | `PathParams` | `RequestHandlerParams[]` | Regex/multi-path with error handlers |
| 5 | `PathParams` | `Application` | Mount a sub-application at a path |

---

## Architecture

The solution is split across three layers:

### 1. Rust — `src/lib.rs`

Five named methods on the `Application` struct, one per overload. The Rust compiler monomorphizes each independently. `Request` and `Response` are stubbed as empty structs since their internal shape is irrelevant to this exercise.

```
getWithHandler          → Overload 1
getWithMixedHandlers    → Overload 2
getWithPathParams       → Overload 3
getWithPathParamsMixed  → Overload 4
getWithSubApp           → Overload 5
```

### 2. JavaScript bridge — `index.js`

A single `get` method is patched onto the native class's prototype. At runtime it inspects the arguments to determine which overload is being called, then delegates to the correct named Rust method:

- Is the last argument an `Application` instance? → Overload 5
- Is the path a plain string and no error handlers? → Overload 1
- Is the path a plain string and has error handlers (arity 4)? → Overload 2
- Is the path an array and no error handlers? → Overload 3
- Is the path an array and has error handlers? → Overload 4

### 3. TypeScript declarations — `index.d.ts`

`Application` is declared as a class with `get: IRouterMatcher<Application, 'get'>`. This gives TypeScript full knowledge of all 5 overloads and enforces correct argument types at compile time. The overload resolution happens here — by the time code runs, it is always a single `get(path, ...args)` call.

---

## Usage

```ts
import { Application } from 'rust-js-bindings'

const app = new Application()

// Overload 1 — typed route string + normal handler
app.get('/users/:id', (req, res, next) => {
  // req.params.id is typed as string
})

// Overload 2 — typed route string + error handler in chain
app.get('/users/:id', handler, (err, req, res, next) => {})

// Overload 3 — array of paths + normal handler
app.get(['/users', '/people'], (req, res, next) => {})

// Overload 4 — array of paths + error handler in chain
app.get(['/users', '/people'], handler, (err, req, res, next) => {})

// Overload 5 — mount a sub-application
const usersApp = new Application()
app.get('/users', usersApp)
```

---

## Building

**Debug build** (fast compile, no optimizations):
```bash
npm run build:debug
```

**Release build** (optimized, for production):
```bash
npm run build
```

Both commands compile the Rust crate via `cargo` and emit a platform-specific `.node` file (e.g. `rust-js-bindings.linux-x64-gnu.node`) that Node.js loads at runtime.

---

## Prerequisites

- [Node.js](https://nodejs.org) >= 18
- [Rust](https://rustup.rs) (stable toolchain)
- [@napi-rs/cli](https://napi.rs) (installed as a dev dependency)

---

## Project Structure

```
.
├── src/
│   └── lib.rs          # Rust implementation — Application struct and 5 get_* methods
├── index.js            # Native binding loader + get() prototype patch
├── index.d.ts          # TypeScript declarations — Application class with IRouterMatcher
├── Cargo.toml          # Rust crate config
└── package.json        # Node package config
```
