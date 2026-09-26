// V06 tests - login rate limiting + generic error messages
// each test gets its own fresh limiter (same settings as the real one) in front
// of the real login controller, so the tests don't affect each other
const { describe, test, before, after, beforeEach, afterEach, mock } = require('node:test');
const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');

const {
  TEST_PASSWORD,
  WRONG_PASSWORD,
  ACTIVE_EMAIL,
  INACTIVE_EMAIL,
  UNKNOWN_EMAIL,
  stubUserLookup,
  silenceConsoleLog,
  startServer,
  login,
  remainingFrom
} = require('./helpers/authTestUtils');
const { login: loginController } = require('../controllers/authController');
const {
  createLoginLimiter,
  LOGIN_WINDOW_MS,
  LOGIN_MAX_FAILED_ATTEMPTS
} = require('../middleware/rateLimiter');

const INVALID_CREDENTIALS = { success: false, message: 'Invalid email or password' };
const TOO_MANY_ATTEMPTS = { success: false, message: 'Too many login attempts. Please try again later.' };

const failTimes = async (baseUrl, count) => {
  const responses = [];
  for (let i = 0; i < count; i++) {
    responses.push(await login(baseUrl, ACTIVE_EMAIL, WRONG_PASSWORD));
  }
  return responses;
};

describe('login rate limiter runtime settings', () => {
  test('allows 5 failed attempts per 15 minute window', () => {
    // if someone changes these limits by mistake this test will fail
    assert.equal(LOGIN_MAX_FAILED_ATTEMPTS, 5);
    assert.equal(LOGIN_WINDOW_MS, 15 * 60 * 1000);
  });
});

describe('POST /api/auth/login with the login limiter', () => {
  let server;

  before(() => {
    stubUserLookup();
    silenceConsoleLog();
  });
  after(() => mock.restoreAll());

  beforeEach(async () => {
    server = await startServer((app) => {
      app.post('/api/auth/login', createLoginLimiter(), loginController);
    });
  });
  afterEach(() => server.close());

  test('failed attempts below the threshold keep the normal 401 response', async () => {
    const responses = await failTimes(server.baseUrl, LOGIN_MAX_FAILED_ATTEMPTS);

    responses.forEach((res, i) => {
      assert.equal(res.status, 401, `attempt ${i + 1}`);
      assert.deepEqual(res.body, INVALID_CREDENTIALS);
      assert.equal(remainingFrom(res.headers), LOGIN_MAX_FAILED_ATTEMPTS - (i + 1));
    });
  });

  test('unknown email and wrong password give identical responses', async () => {
    const unknown = await login(server.baseUrl, UNKNOWN_EMAIL, WRONG_PASSWORD);
    const wrongPassword = await login(server.baseUrl, ACTIVE_EMAIL, WRONG_PASSWORD);
    const inactiveWrongPassword = await login(server.baseUrl, INACTIVE_EMAIL, WRONG_PASSWORD);

    for (const res of [unknown, wrongPassword, inactiveWrongPassword]) {
      assert.equal(res.status, 401);
      assert.deepEqual(res.body, INVALID_CREDENTIALS);
    }
  });

  test('attempts over the threshold receive 429 with a generic body', async () => {
    await failTimes(server.baseUrl, LOGIN_MAX_FAILED_ATTEMPTS);

    const blocked = await login(server.baseUrl, ACTIVE_EMAIL, WRONG_PASSWORD);
    assert.equal(blocked.status, 429);
    assert.deepEqual(blocked.body, TOO_MANY_ATTEMPTS);
    assert.equal(blocked.headers.get('ratelimit-policy'), '5;w=900');
    const retryAfter = Number(blocked.headers.get('retry-after'));
    assert.ok(retryAfter > 0 && retryAfter <= 900, `Retry-After was ${retryAfter}`);
    assert.equal(blocked.headers.get('x-ratelimit-limit'), null);

    // once blocked it's always 429, doesn't matter which email/password is used
    const unknown = await login(server.baseUrl, UNKNOWN_EMAIL, WRONG_PASSWORD);
    const correct = await login(server.baseUrl, ACTIVE_EMAIL, TEST_PASSWORD);
    for (const res of [unknown, correct]) {
      assert.equal(res.status, 429);
      assert.deepEqual(res.body, TOO_MANY_ATTEMPTS);
    }
  });

  test('a successful login still returns 200 with a valid token and no password', async () => {
    const res = await login(server.baseUrl, ACTIVE_EMAIL, TEST_PASSWORD);

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.message, 'Login successful');
    assert.equal(res.body.data.user.email, ACTIVE_EMAIL);
    assert.equal(res.body.data.user.password, undefined);
    const payload = jwt.verify(res.body.data.token, process.env.JWT_SECRET);
    assert.equal(payload.userId, res.body.data.user._id);
  });

  test('successful logins are not counted towards the limit', async () => {
    for (let i = 0; i < LOGIN_MAX_FAILED_ATTEMPTS * 2; i++) {
      const res = await login(server.baseUrl, ACTIVE_EMAIL, TEST_PASSWORD);
      assert.equal(res.status, 200, `successful login ${i + 1}`);
    }

    // should still have all 5 attempts left after those logins
    const failures = await failTimes(server.baseUrl, LOGIN_MAX_FAILED_ATTEMPTS);
    failures.forEach((res) => assert.equal(res.status, 401));
    assert.equal((await login(server.baseUrl, ACTIVE_EMAIL, WRONG_PASSWORD)).status, 429);
  });

  test('a user who mistypes a few times can still log in', async () => {
    await failTimes(server.baseUrl, LOGIN_MAX_FAILED_ATTEMPTS - 1);

    const res = await login(server.baseUrl, ACTIVE_EMAIL, TEST_PASSWORD);
    assert.equal(res.status, 200);
    assert.ok(res.body.data.token);
  });

  test('deactivated state is only revealed after the correct password', async () => {
    const res = await login(server.baseUrl, INACTIVE_EMAIL, TEST_PASSWORD);

    assert.equal(res.status, 401);
    assert.deepEqual(res.body, { success: false, message: 'Account is deactivated' });
  });
});
