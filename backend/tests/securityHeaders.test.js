// V07 tests - security headers on API responses //V07
const { describe, test, afterEach } = require('node:test');
const assert = require('node:assert/strict');

const { startServer, request } = require('./helpers/authTestUtils');
const { securityHeaders } = require('../middleware/securityHeaders');

const API_CSP = "default-src 'none';frame-ancestors 'none';base-uri 'none';form-action 'none'";

// small app with the headers middleware first, same as app.js
const startApi = () => startServer((app) => {
  app.use(securityHeaders());
  app.get('/api/health', (req, res) => res.json({ success: true }));
  app.use('*', (req, res) => res.status(404).json({ success: false, message: 'Route not found' }));
});

describe('API security headers', () => {
  const originalNodeEnv = process.env.NODE_ENV;
  let server;

  afterEach(async () => {
    process.env.NODE_ENV = originalNodeEnv;
    await server?.close();
  });

  test('JSON responses get CSP, anti-framing, nosniff and referrer policy', async () => {
    server = await startApi();
    const res = await request(server.baseUrl, 'GET', '/api/health');

    assert.equal(res.status, 200);
    assert.equal(res.headers.get('content-security-policy'), API_CSP);
    assert.equal(res.headers.get('x-frame-options'), 'DENY');
    assert.equal(res.headers.get('x-content-type-options'), 'nosniff');
    assert.equal(res.headers.get('referrer-policy'), 'no-referrer');
    assert.equal(res.headers.get('x-powered-by'), null);
  });

  test('error responses like 404 get the same headers', async () => {
    server = await startApi();
    const res = await request(server.baseUrl, 'GET', '/api/nope');

    assert.equal(res.status, 404);
    assert.equal(res.headers.get('content-security-policy'), API_CSP);
    assert.equal(res.headers.get('x-frame-options'), 'DENY');
    assert.equal(res.headers.get('x-content-type-options'), 'nosniff');
  });

  test('no HSTS when running locally over http', async () => {
    process.env.NODE_ENV = 'development';
    server = await startApi();
    const res = await request(server.baseUrl, 'GET', '/api/health');

    assert.equal(res.headers.get('strict-transport-security'), null);
  });

  test('HSTS is only turned on for production (https deployment)', async () => {
    process.env.NODE_ENV = 'production';
    server = await startApi();
    const res = await request(server.baseUrl, 'GET', '/api/health');

    assert.equal(res.headers.get('strict-transport-security'), 'max-age=15552000; includeSubDomains');
  });
});
