const helmet = require('helmet'); //V07

// V07 - browser security headers for everything the API sends back
// the API only returns JSON (and one PDF download), nothing here should ever
// render as a page, so the CSP just blocks everything and stops framing.
// helmet also adds nosniff, a no-referrer policy and removes X-Powered-By.
// it's a function so NODE_ENV is read after dotenv has loaded the .env file
const securityHeaders = () => helmet({
  contentSecurityPolicy: {
    useDefaults: false,
    directives: {
      defaultSrc: ["'none'"],
      frameAncestors: ["'none'"],
      baseUri: ["'none'"],
      formAction: ["'none'"]
    }
  },
  frameguard: { action: 'deny' },
  referrerPolicy: { policy: 'no-referrer' },
  // HSTS only makes sense over https (the vercel deployment), not local http
  strictTransportSecurity: process.env.NODE_ENV === 'production'
    ? { maxAge: 15552000, includeSubDomains: true }
    : false
});

module.exports = {
  securityHeaders
};
