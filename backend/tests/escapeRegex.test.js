// V05 tests - regex injection via user-supplied search/filter input //V05
// makes sure client input can never become a regex pattern (injection / ReDoS)
// and that the search endpoints really escape it before querying mongo
const { describe, test } = require('node:test');
const assert = require('node:assert/strict');

const { escapeRegex } = require('../utils/utils');
const User = require('../models/User');
const { getAllUsers } = require('../controllers/userController');

describe('escapeRegex neutralizes regex metacharacters (UC-V05)', () => {
  test('every regex metacharacter is escaped', () => {
    const metacharacters = ['.', '*', '+', '?', '^', '$', '{', '}', '(', ')', '|', '[', ']', '\\'];
    for (const char of metacharacters) {
      const pattern = new RegExp(escapeRegex(char));
      assert.equal(pattern.test(char), true, `escaped ${char} should still match its own literal`);
      assert.equal(pattern.test('a'), false, `escaped ${char} must not act as a pattern`);
    }
  });

  test('plain text passes through unchanged', () => {
    assert.equal(escapeRegex('John Doe 42'), 'John Doe 42');
  });

  test('injection and ReDoS payloads only match as literal text', () => {
    const payloads = ['(.*)+$', '^(a|a)*$', '.*', '[a-z', '(?=admin)', 'a{1,999999}'];
    for (const payload of payloads) {
      const pattern = new RegExp(escapeRegex(payload));
      assert.equal(pattern.test(payload), true, `payload ${payload} should match itself literally`);
      assert.equal(pattern.test('anything else'), false, `payload ${payload} must not match other text`);
    }
  });

  test('non-string input is coerced instead of throwing', () => {
    assert.doesNotThrow(() => escapeRegex(undefined));
    assert.doesNotThrow(() => escapeRegex(123));
  });
});

describe('user search query is escaped before hitting $regex (UC-V05)', () => {
  // stubs User.find / User.countDocuments so we can inspect the exact filter
  // the controller builds from req.query.search
  const captureSearchFilter = async (t, search) => {
    let capturedFilter;
    const chain = {
      select: () => chain,
      sort: () => chain,
      skip: () => chain,
      limit: async () => []
    };
    t.mock.method(User, 'find', (filter) => {
      capturedFilter = filter;
      return chain;
    });
    t.mock.method(User, 'countDocuments', async () => 0);

    const req = { query: { search } };
    const res = { status: () => res, json: () => {} };
    await getAllUsers(req, res);
    return capturedFilter;
  };

  test('search="(.*)+" reaches $regex fully escaped', async (t) => {
    const filter = await captureSearchFilter(t, '(.*)+');

    const namePattern = filter.$or[0].name.$regex;
    assert.equal(namePattern, escapeRegex('(.*)+'));
    assert.equal(new RegExp(namePattern, 'i').test('(.*)+'), true);
    assert.equal(new RegExp(namePattern, 'i').test('anything'), false);
  });

  test('search=".*" does not become a match-everything pattern', async (t) => {
    const filter = await captureSearchFilter(t, '.*');

    const emailPattern = new RegExp(filter.$or[1].email.$regex, 'i');
    assert.equal(emailPattern.test('admin@test.com'), false);
    assert.equal(emailPattern.test('.*'), true);
  });

  test('normal search terms are still matched case-insensitively', async (t) => {
    const filter = await captureSearchFilter(t, 'John');

    const namePattern = new RegExp(filter.$or[0].name.$regex, filter.$or[0].name.$options);
    assert.equal(namePattern.test('john smith'), true);
    assert.equal(namePattern.test('JOHN SMITH'), true);
  });
});
