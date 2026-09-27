// V08 tests - CORS only trusts the configured frontend origins //V08
// exercises the real corsOptions from middleware/corsPolicy.js (the same one
// app.js mounts) to prove unknown browser origins are rejected
const { describe, test, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const cors = require('cors');

const { corsOptions, getAllowedOrigins } = require('../middleware/corsPolicy');
const { startServer } = require('./helpers/authTestUtils');

const TRUSTED = 'https://app.urban-cleanse.example';
const TRUSTED_ADMIN = 'https://admin.urban-cleanse.example';
const UNTRUSTED = 'https://evil.example';

// same middleware order as app.js, plus an error handler so the CORS rejection
// surfaces as a status code instead of an unhandled error in the test server
const startApi = () => startServer((app) => {
  app.use(cors(corsOptions));
  app.get('/api/health', (req, res) => res.json({ success: true }));
  app.use((err, req, res, next) => res.status(403).json({ success: false, message: err.message }));
});

const call = (baseUrl, { origin, method = 'GET', path = '/api/health' } = {}) =>
  fetch(`${baseUrl}${path}`, {
    method,
    headers: origin ? { Origin: origin } : {}
  });

describe('CORS origin allowlist (UC-V08)', () => {
  const originalOrigins = process.env.CORS_ORIGINS;
  let server;

  beforeEach(() => {
    process.env.CORS_ORIGINS = `${TRUSTED}, ${TRUSTED_ADMIN}`;
  });

  afterEach(async () => {
    process.env.CORS_ORIGINS = originalOrigins;
    await server?.close();
  });

  test('a trusted origin gets Access-Control-Allow-Origin', async () => {
    server = await startApi();
    const res = await call(server.baseUrl, { origin: TRUSTED });

    assert.equal(res.status, 200);
    assert.equal(res.headers.get('access-control-allow-origin'), TRUSTED);
  });

  test('an unknown origin is rejected and gets no CORS headers', async () => {
    server = await startApi();
    const res = await call(server.baseUrl, { origin: UNTRUSTED });

    assert.equal(res.status, 403);
    assert.equal(res.headers.get('access-control-allow-origin'), null);
    assert.match((await res.json()).message, /not allowed by CORS/i);
  });

  test('requests without an Origin header (curl, server-to-server) are allowed', async () => {
    server = await startApi();
    const res = await call(server.baseUrl, {});

    assert.equal(res.status, 200);
  });

  test('preflight from a trusted origin passes', async () => {
    server = await startApi();
    const res = await call(server.baseUrl, { origin: TRUSTED, method: 'OPTIONS' });

    assert.ok(res.status === 204 || res.status === 200);
    assert.equal(res.headers.get('access-control-allow-origin'), TRUSTED);
    assert.ok(res.headers.get('access-control-allow-methods'));
  });

  test('preflight from an unknown origin is blocked', async () => {
    server = await startApi();
    const res = await call(server.baseUrl, { origin: UNTRUSTED, method: 'OPTIONS' });

    assert.equal(res.status, 403);
    assert.equal(res.headers.get('access-control-allow-origin'), null);
  });

  test('the allowlist is comma separated and trimmed', () => {
    assert.deepEqual(getAllowedOrigins(), [TRUSTED, TRUSTED_ADMIN]);
  });

  test('falls back to the Vite dev server when CORS_ORIGINS is unset', () => {
    delete process.env.CORS_ORIGINS;
    assert.deepEqual(getAllowedOrigins(), ['http://localhost:5173']);
  });
});
