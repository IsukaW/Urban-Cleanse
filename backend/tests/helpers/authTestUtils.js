// helper stuff for the login rate limit tests (V06)
// we don't load app.js here because it connects to mongo and starts the server,
// and we don't read .env either. the tests just put the real auth routes on a
// small express app and swap User.findOne for some fake users

// dummy secret just for tests, has to be set before the controller uses it
process.env.JWT_SECRET = 'test-only-jwt-secret-not-used-anywhere-else-0123456789';

const { mock } = require('node:test');
const express = require('express');
const bcrypt = require('bcryptjs');
const User = require('../../models/User');

const TEST_PASSWORD = 'Correct@123';
const WRONG_PASSWORD = 'Wrong@123';
const ACTIVE_EMAIL = 'active.user@test.local';
const INACTIVE_EMAIL = 'inactive.user@test.local';
const UNKNOWN_EMAIL = 'nobody@test.local';

// low bcrypt cost so the tests run fast (only used for the fake test users)
const passwordHash = bcrypt.hashSync(TEST_PASSWORD, 4);
const accounts = {
  [ACTIVE_EMAIL]: { isActive: true },
  [INACTIVE_EMAIL]: { isActive: false }
};

// fake version of User.findOne({ email }).select('+password') that login uses
const stubUserLookup = () => {
  mock.method(User, 'findOne', (query) => ({
    select: async () => {
      const account = accounts[query.email];
      if (!account) return null;
      const user = new User({ name: 'Test User', email: query.email, role: 'user', isActive: account.isActive });
      user.password = passwordHash;
      return user;
    }
  }));
};

// login controller console.logs every attempt, muting it so the test output isn't a mess
const silenceConsoleLog = () => {
  mock.method(console, 'log', () => {});
};

const startServer = (mount) => new Promise((resolve) => {
  const app = express();
  app.use(express.json());
  mount(app);
  const server = app.listen(0, '127.0.0.1', () => {
    const baseUrl = `http://127.0.0.1:${server.address().port}`;
    resolve({
      baseUrl,
      close: () => new Promise((done) => {
        server.closeAllConnections();
        server.close(done);
      })
    });
  });
});

const request = async (baseUrl, method, path, body) => {
  const res = await fetch(`${baseUrl}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body)
  });
  return { status: res.status, headers: res.headers, body: await res.json() };
};

const login = (baseUrl, email, password, path = '/api/auth/login') =>
  request(baseUrl, 'POST', path, { email, password });

// gets the remaining count out of the RateLimit header e.g. "limit=5, remaining=3, reset=900"
const remainingFrom = (headers) => {
  const match = /remaining=(\d+)/.exec(headers.get('ratelimit') || '');
  return match ? Number(match[1]) : undefined;
};

module.exports = {
  TEST_PASSWORD,
  WRONG_PASSWORD,
  ACTIVE_EMAIL,
  INACTIVE_EMAIL,
  UNKNOWN_EMAIL,
  stubUserLookup,
  silenceConsoleLog,
  startServer,
  request,
  login,
  remainingFrom
};
