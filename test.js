const { Application, Request, Response } = require('./index.js')

let passed = 0
let failed = 0

function assert(label, condition) {
  if (condition) {
    console.log(`  ✓ ${label}`)
    passed++
  } else {
    console.error(`  ✗ ${label}`)
    failed++
  }
}

// ─── Request ────────────────────────────────────────────────────────────────
console.log('\nRequest')
const req = new Request('GET', '/users/123')
assert('instantiates',           req instanceof Request)
assert('method field',           req.method === 'GET')
assert('path field',             req.path === '/users/123')
assert('params is object',       typeof req.params === 'object' && req.params !== null)
assert('params starts empty',    Object.keys(req.params).length === 0)

// ─── Response ───────────────────────────────────────────────────────────────
console.log('\nResponse')
const res = new Response()
assert('instantiates',           res instanceof Response)
assert('default statusCode 200', res.statusCode === 200)
res.status(404)
assert('status() mutates code',  res.statusCode === 404)
assert('send() does not throw',  (() => { try { res.send('hello'); return true } catch { return false } })())

// ─── Application ────────────────────────────────────────────────────────────
console.log('\nApplication — overload dispatch')
const app = new Application()
assert('instantiates', app instanceof Application)

// Overload 1 — string path + normal handler
assert('overload 1 does not throw', (() => {
  try { app.get('/users/:id', (req, res, next) => {}); return true } catch { return false }
})())

// Overload 2 — string path + error handler in chain
assert('overload 2 does not throw', (() => {
  try { app.get('/users/:id', (req, res, next) => {}, (err, req, res, next) => {}); return true } catch { return false }
})())

// Overload 3 — array path + normal handler
assert('overload 3 does not throw', (() => {
  try { app.get(['/users', '/people'], (req, res, next) => {}); return true } catch { return false }
})())

// Overload 4 — array path + error handler in chain
assert('overload 4 does not throw', (() => {
  try { app.get(['/users', '/people'], (req, res, next) => {}, (err, req, res, next) => {}); return true } catch { return false }
})())

// Overload 5 — sub-application mounting
assert('overload 5 does not throw', (() => {
  try { app.get('/users', new Application()); return true } catch { return false }
})())

// Chaining
assert('get() returns this for chaining', (() => {
  try {
    const result = app.get('/a', (req, res, next) => {}).get('/b', (req, res, next) => {})
    return result === app
  } catch { return false }
})())

// ─── Summary ────────────────────────────────────────────────────────────────
console.log(`\n${passed + failed} tests: ${passed} passed, ${failed} failed\n`)
process.exit(failed > 0 ? 1 : 0)
