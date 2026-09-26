// V06 tests - checking the real auth router only rate limits POST /login
const { describe, test, before, after, beforeEach, mock } = require('node:test');
const assert = require('node:assert/strict');

const {
  WRONG_PASSWORD,
  ACTIVE_EMAIL,
  stubUserLookup,
  silenceConsoleLog,
  startServer,
  request,
  login
} = require('./helpers/authTestUtils');
const authRouter = require('../routes/auth');
const authController = require('../controllers/authController');
const { loginLimiter, LOGIN_MAX_FAILED_ATTEMPTS } = require('../middleware/rateLimiter');

describe('auth router wiring', () => {
  const routes = authRouter.stack
    .filter((layer) => layer.route)
    .map((layer) => ({
      path: layer.route.path,
      methods: Object.keys(layer.route.methods),
      handlers: layer.route.stack.map((s) => s.handle)
    }));

  test('POST /login runs the login limiter before the login controller', () => {
    const loginRoute = routes.find((r) => r.path === '/login' && r.methods.includes('post'));

    assert.ok(loginRoute, 'POST /login route exists');
    assert.deepEqual(loginRoute.handlers, [loginLimiter, authController.login]);
  });

  test('no other auth route uses the login limiter', () => {
    const others = routes.filter((r) => r.path !== '/login');

    assert.ok(others.length >= 5, 'expected the other auth routes to be registered');
    for (const route of others) {
      assert.ok(!route.handlers.includes(loginLimiter), `${route.methods} ${route.path} must not be rate limited`);
    }
  });
});

describe('real /api/auth router under a login brute-force attempt', () => {
  let server;

  before(async () => {
    stubUserLookup();
    silenceConsoleLog();
    server = await startServer((app) => app.use('/api/auth', authRouter));
  });
  after(async () => {
    await server.close();
    mock.restoreAll();
  });
  // the router's limiter is shared between tests so reset our IP's count before each one
  beforeEach(() => loginLimiter.resetKey('127.0.0.1'));

  test('login is blocked after the threshold, other auth routes behave normally', async () => {
    for (let i = 1; i <= LOGIN_MAX_FAILED_ATTEMPTS; i++) {
      const res = await login(server.baseUrl, ACTIVE_EMAIL, WRONG_PASSWORD);
      assert.equal(res.status, 401, `attempt ${i}`);
    }
    const blocked = await login(server.baseUrl, ACTIVE_EMAIL, WRONG_PASSWORD);
    assert.equal(blocked.status, 429);

    // login is blocked now, but the other routes should still work normally
    // for the same IP and shouldn't have any rate limit headers
    const expectations = [
      ['POST', '/api/auth/register', {}, 400, 'Please provide name, email, and password'],
      ['POST', '/api/auth/google', {}, 400, 'Google credential is required'],
      ['GET', '/api/auth/profile', undefined, 401, 'Not authorized, no token provided'],
      ['PUT', '/api/auth/profile', {}, 401, 'Not authorized, no token provided'],
      ['POST', '/api/auth/create-user', {}, 401, 'Not authorized, no token provided']
    ];
    for (const [method, path, body, status, message] of expectations) {
      const res = await request(server.baseUrl, method, path, body);
      assert.equal(res.status, status, `${method} ${path}`);
      assert.equal(res.body.message, message, `${method} ${path}`);
      assert.equal(res.headers.get('ratelimit'), null, `${method} ${path} has rate-limit headers`);
    }
  });

  test('case and trailing-slash variants of the login path share one limit', async () => {
    // express ignores case and trailing slashes, so all of these go to the same
    // route. just checking they count towards the same limit and can't be used
    // to get extra attempts
    const variants = ['/api/auth/LOGIN', '/api/auth/login/', '/api/auth/Login'];
    for (let i = 0; i < LOGIN_MAX_FAILED_ATTEMPTS; i++) {
      const path = variants[i % variants.length];
      const res = await login(server.baseUrl, ACTIVE_EMAIL, WRONG_PASSWORD, path);
      assert.equal(res.status, 401, path);
    }
    const blocked = await login(server.baseUrl, ACTIVE_EMAIL, WRONG_PASSWORD);
    assert.equal(blocked.status, 429);
  });
});
