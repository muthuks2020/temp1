// middleware/rateLimiter.js — Rate limiting configuration
'use strict';

const rateLimit = require('express-rate-limit');

/**
 * Standard error response shape for rate limit responses.
 */
function rateLimitHandler(req, res) {
  return res.status(429).json({
    error:   true,
    message: 'Too many requests. Please wait and try again.',
    code:    'RATE_LIMIT_EXCEEDED',
  });
}

/**
 * globalLimiter
 * Applied to ALL routes: 100 requests per 15 minutes per IP.
 */
const globalLimiter = rateLimit({
  windowMs:         15 * 60 * 1000, // 15 minutes
  max:              100,
  standardHeaders:  true,
  legacyHeaders:    false,
  handler:          rateLimitHandler,
  keyGenerator:     (req) =>
    req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket.remoteAddress,
});

/**
 * authLimiter
 * Applied to auth routes only: 10 requests per 15 minutes per IP.
 * Prevents brute-force on the auth callback.
 */
const authLimiter = rateLimit({
  windowMs:         15 * 60 * 1000, // 15 minutes
  max:              10,
  standardHeaders:  true,
  legacyHeaders:    false,
  handler:          rateLimitHandler,
  keyGenerator:     (req) =>
    req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket.remoteAddress,
  skip:             (req) => process.env.NODE_ENV === 'test',
});

module.exports = { globalLimiter, authLimiter };
