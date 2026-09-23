const { rateLimit } = require('express-rate-limit');

// Login brute-force protection (UC-V06, CWE-307)
// Allows 5 failed login attempts per client IP in a 15 minute window.
// Successful logins (status < 400) are not counted, so a legitimate user
// who eventually enters the right password is not locked out by earlier typos.
// Limiting by IP rather than by email avoids letting an attacker lock a
// victim out of their account just by knowing their email address.
const LOGIN_WINDOW_MS = 15 * 60 * 1000;
const LOGIN_MAX_FAILED_ATTEMPTS = 5;

const loginLimiter = rateLimit({
  windowMs: LOGIN_WINDOW_MS,
  limit: LOGIN_MAX_FAILED_ATTEMPTS,
  skipSuccessfulRequests: true,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  // Same response whether or not the account exists
  handler: (req, res, next, options) => {
    res.status(options.statusCode).json({
      success: false,
      message: 'Too many login attempts. Please try again later.'
    });
  }
});

module.exports = {
  loginLimiter
};
