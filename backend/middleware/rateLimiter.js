const { rateLimit } = require('express-rate-limit');

// V06 - stops brute forcing on the login route
// after 5 wrong attempts from the same IP within 15 mins we send back a 429.
// successful logins aren't counted, so if someone gets the password wrong a
// couple of times and then gets it right they don't get locked out.
// using the IP and not the email on purpose - if we limited by email, anyone
// could lock a user out just by spamming wrong passwords with their email
const LOGIN_WINDOW_MS = 15 * 60 * 1000;
const LOGIN_MAX_FAILED_ATTEMPTS = 5;

// made this into a function so the tests can make a fresh limiter each time
// (counts are kept in memory so they'd carry over between tests otherwise).
// settings are hardcoded here so the tests always use the same limits as the app
const createLoginLimiter = () => rateLimit({
  windowMs: LOGIN_WINDOW_MS,
  limit: LOGIN_MAX_FAILED_ATTEMPTS,
  skipSuccessfulRequests: true,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  // same message for everyone, so it doesn't give away whether the email exists
  handler: (req, res, next, options) => {
    res.status(options.statusCode).json({
      success: false,
      message: 'Too many login attempts. Please try again later.'
    });
  }
});

const loginLimiter = createLoginLimiter();

module.exports = {
  loginLimiter,
  createLoginLimiter,
  LOGIN_WINDOW_MS,
  LOGIN_MAX_FAILED_ATTEMPTS
};
