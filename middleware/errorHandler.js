// middleware/errorHandler.js — Global error handler
'use strict';

const logger = require('../config/logger');

/**
 * errorHandler
 * Catches all unhandled errors passed via next(err).
 * - Logs full error with stack to winston.
 * - Returns a safe, generic 500 to the client — never exposes internals.
 *
 * Must be registered LAST in the Express middleware chain (app.use(errorHandler)).
 */
// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  // Log the full error internally
  logger.error('Unhandled error', {
    message:  err.message,
    stack:    err.stack,
    method:   req.method,
    path:     req.path,
    ip:       req.ip,
    userEmail: req.user?.email || null,
  });

  // Never expose stack traces or internal error details to the client
  return res.status(500).json({
    error:   true,
    message: 'An unexpected error occurred. Please try again.',
    code:    'INTERNAL_ERROR',
  });
}

/**
 * notFound
 * Handles requests that don't match any registered route.
 */
function notFound(req, res) {
  return res.status(404).json({
    error:   true,
    message: `Route not found: ${req.method} ${req.path}`,
    code:    'NOT_FOUND',
  });
}

module.exports = { errorHandler, notFound };
