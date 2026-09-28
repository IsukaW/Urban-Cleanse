// V05 tests - regex injection via user-supplied search/filter input //V05
// makes sure client input can never become a regex pattern (injection / ReDoS)
// and that the search endpoints really escape it before querying mongo
const { describe, test } = require('node:test');
const assert = require('node:assert/strict');

const { escapeRegex, sanitizeSearchTerm, MAX_SEARCH_LENGTH } = require('../utils/utils');
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
      maxTimeMS: () => chain,
      limit: async () => []
    };
    t.mock.method(User, 'find', (filter) => {
      capturedFilter = filter;
      return chain;
    });
    t.mock.method(User, 'countDocuments', () => ({ maxTimeMS: async () => 0 }));

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
});

describe('sanitizeSearchTerm enforces input limits before escaping (UC-V05)', () => {
  test('still escapes regex metacharacters like escapeRegex', () => {
    assert.equal(sanitizeSearchTerm('a.b'), 'a\\.b');
    assert.equal(sanitizeSearchTerm('(.*)+'), escapeRegex('(.*)+'));
  });

  test('input at the maximum length is accepted', () => {
    const exact = 'a'.repeat(MAX_SEARCH_LENGTH);
    assert.equal(sanitizeSearchTerm(exact), exact);
  });

  test('input over the maximum length is rejected with statusCode 400', () => {
    const tooLong = 'a'.repeat(MAX_SEARCH_LENGTH + 1);
    assert.throws(
      () => sanitizeSearchTerm(tooLong),
      (err) => err.statusCode === 400,
      'over-long input must be rejected'
    );
  });

  test('control, null-byte and zero-width characters are rejected with statusCode 400', () => {
    const badInputs = ['a\u0000b', 'a\u001Fb', 'a\u007Fb', '\u200Badmin', 'admin\u202Etxt.exe'];
    for (const input of badInputs) {
      assert.throws(
        () => sanitizeSearchTerm(input),
        (err) => err.statusCode === 400,
        `input ${JSON.stringify(input)} must be rejected`
      );
    }
  });

  test('normal names, emails and unicode text pass through', () => {
    assert.doesNotThrow(() => sanitizeSearchTerm("o'brien@company.lk"));
    assert.doesNotThrow(() => sanitizeSearchTerm('Ñandú (Pvt) Ltd'));
    assert.doesNotThrow(() => sanitizeSearchTerm('කොළඹ'));
    assert.equal(sanitizeSearchTerm(''), '');
    // literal matching is preserved: a cleaned dot only matches a real dot
    const pattern = new RegExp(sanitizeSearchTerm('a.b'), 'i');
    assert.equal(pattern.test('a.b'), true);
    assert.equal(pattern.test('axb'), false);
  });
});

describe('user search rejects bad input with 400 instead of querying (UC-V05)', () => {
  const invokeGetAllUsers = async (t, search) => {
    const chain = {
      select: () => chain,
      sort: () => chain,
      skip: () => chain,
      maxTimeMS: () => chain,
      limit: async () => []
    };
    t.mock.method(User, 'find', () => chain);
    t.mock.method(User, 'countDocuments', () => ({ maxTimeMS: async () => 0 }));

    let statusCode = 200;
    let body;
    const req = { query: { search } };
    const res = {
      status: (code) => { statusCode = code; return res; },
      json: (payload) => { body = payload; }
    };
    await getAllUsers(req, res);
    return { statusCode, body };
  };

  test('over-long search terms get a 400, not a 500', async (t) => {
    const { statusCode, body } = await invokeGetAllUsers(t, 'a'.repeat(200));
    assert.equal(statusCode, 400);
    assert.equal(body.success, false);
  });

  test('null-byte search terms get a 400', async (t) => {
    const { statusCode } = await invokeGetAllUsers(t, 'admin\u0000');
    assert.equal(statusCode, 400);
  });

  test('valid search terms still reach the query and succeed', async (t) => {
    const { statusCode } = await invokeGetAllUsers(t, '.*');
    assert.equal(statusCode, 200);
  });
});
