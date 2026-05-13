// middleware/requestLogger.js — Winston HTTP request logger
'use strict';

const logger = require('../config/logger');

/**
 * requestLogger
 * Logs every completed HTTP request with method, path, status, duration,
 * authenticated user email (if available), and client IP.
 */
function requestLogger(req, res, next) {
  const startAt = process.hrtime.bigint();

  res.on('finish', () => {
    const durationMs = Number(process.hrtime.bigint() - startAt) / 1e6;

    const ip =
      req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
      req.socket?.remoteAddress ||
      'unknown';

    logger.info('HTTP request', {
      method:    req.method,
      path:      req.path,
      status:    res.statusCode,
      durationMs: Math.round(durationMs),
      userEmail: req.user?.email || null,
      ip,
    });
  });

  return next();
}

module.exports = { requestLogger };
