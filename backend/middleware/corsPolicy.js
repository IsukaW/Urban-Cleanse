// UC-V08: restrict CORS to trusted frontend origins.
// Only browser requests from origins listed in CORS_ORIGINS (comma separated,
// default: the Vite dev server) may call the API cross-origin. Requests without
// an Origin header (curl, server-to-server, same-origin) are allowed because
// CORS is a browser-only protection. Unknown origins get an error so the
// browser blocks the response.
const cors = require('cors');

const getAllowedOrigins = () =>
  (process.env.CORS_ORIGINS || 'http://localhost:5173')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

const corsOptions = {
  credentials: false,
  origin: (origin, callback) => {
    if (!origin || getAllowedOrigins().includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Origin not allowed by CORS'));
    }
  }
};

module.exports = { getAllowedOrigins, corsOptions };
