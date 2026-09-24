// V07 tests - checks the frontend CSP keeps its protections and still allows //V07
// what the app actually needs (google sign-in, maps, fonts, api)
import { describe, test } from 'node:test'
import assert from 'node:assert/strict'
import { buildCsp } from '../securityHeaders.ts'

// turns "a x y; b z" into { a: ['x', 'y'], b: ['z'] }
const parse = (csp: string) =>
  Object.fromEntries(
    csp.split(';').map((part) => part.trim().split(/\s+/)).map(([name, ...sources]) => [name, sources])
  )

const API_URL = 'http://localhost:5001/api'

describe('frontend CSP protections', () => {
  const policy = parse(buildCsp({ apiUrl: API_URL }))

  test('scripts stay locked down - no unsafe-inline, unsafe-eval or wildcards', () => {
    for (const bad of ["'unsafe-inline'", "'unsafe-eval'", '*', 'https:', 'http:', 'data:']) {
      assert.ok(!policy['script-src'].includes(bad), `script-src must not contain ${bad}`)
    }
  })

  test('no directive allows every origin', () => {
    for (const [name, sources] of Object.entries(policy)) {
      for (const bad of ['*', 'https:', 'http:']) {
        assert.ok(!sources.includes(bad), `${name} must not contain ${bad}`)
      }
    }
  })

  test('clickjacking, plugins and base-tag protections are there', () => {
    assert.deepEqual(policy['default-src'], ["'self'"])
    assert.deepEqual(policy['frame-ancestors'], ["'none'"])
    assert.deepEqual(policy['object-src'], ["'none'"])
    assert.deepEqual(policy['base-uri'], ["'self'"])
    assert.deepEqual(policy['form-action'], ["'self'"])
  })

  test('meta tag version is the same policy minus frame-ancestors (browsers ignore it in meta)', () => {
    const meta = parse(buildCsp({ apiUrl: API_URL, forMetaTag: true }))
    assert.equal(meta['frame-ancestors'], undefined)
    const { 'frame-ancestors': _dropped, ...rest } = policy
    assert.deepEqual(meta, rest)
  })
})

describe('frontend CSP still allows what the app uses', () => {
  const policy = parse(buildCsp({ apiUrl: API_URL }))

  test('google sign-in (OAuth/OIDC) script, button iframe and requests', () => {
    assert.ok(policy['script-src'].includes('https://accounts.google.com/gsi/client'))
    assert.ok(policy['frame-src'].includes('https://accounts.google.com/gsi/'))
    assert.ok(policy['connect-src'].includes('https://accounts.google.com/gsi/'))
    assert.ok(policy['style-src'].includes('https://accounts.google.com/gsi/style'))
  })

  test('maps: osm + esri tiles, marker icons, osm embed iframe, nominatim lookup', () => {
    for (const src of ['https://*.tile.openstreetmap.org', 'https://server.arcgisonline.com',
      'https://cdnjs.cloudflare.com', 'https://raw.githubusercontent.com']) {
      assert.ok(policy['img-src'].includes(src), `img-src should allow ${src}`)
    }
    assert.ok(policy['frame-src'].includes('https://www.openstreetmap.org'))
    assert.ok(policy['connect-src'].includes('https://nominatim.openstreetmap.org'))
  })

  test('google fonts', () => {
    assert.ok(policy['style-src'].includes('https://fonts.googleapis.com'))
    assert.ok(policy['font-src'].includes('https://fonts.gstatic.com'))
  })

  test('api origin comes from VITE_API_URL', () => {
    assert.ok(policy['connect-src'].includes('http://localhost:5001'))
    const prod = parse(buildCsp({ apiUrl: 'https://api.example.com/api' }))
    assert.ok(prod['connect-src'].includes('https://api.example.com'))
    assert.ok(!prod['connect-src'].includes('http://localhost:5001'))
  })

  test('api falls back to the same default as src/services/api.ts, relative url stays same-origin', () => {
    assert.ok(parse(buildCsp({}))['connect-src'].includes('http://localhost:5001'))
    assert.deepEqual(
      parse(buildCsp({ apiUrl: '/api' }))['connect-src'].filter((s) => s.startsWith('http://localhost')),
      []
    )
  })
})

describe('dev server extras', () => {
  test('inline script hashes only go into script-src, hmr websocket only into connect-src', () => {
    const dev = parse(buildCsp({ apiUrl: API_URL, devScriptHashes: ['sha256-abc='], hmrOrigin: 'ws://localhost:5173' }))
    assert.ok(dev['script-src'].includes("'sha256-abc='"))
    assert.ok(dev['connect-src'].includes('ws://localhost:5173'))
    assert.ok(!dev['script-src'].includes('ws://localhost:5173'))
    assert.ok(!dev['connect-src'].includes("'sha256-abc='"))
    // the production policy never gets these
    const prod = parse(buildCsp({ apiUrl: API_URL }))
    assert.ok(!prod['script-src'].some((s) => s.startsWith("'sha256-")))
    assert.ok(!prod['connect-src'].some((s) => s.startsWith('ws:')))
  })
})
