// middleware/auth.js — JWT authentication and role/status guards
'use strict';

const jwt = require('jsonwebtoken');
const logger = require('../config/logger');

const COOKIE_NAME = 'arb_token';

/**
 * authenticateToken
 * Extracts JWT from the httpOnly cookie or Authorization header,
 * verifies signature and expiry, and attaches decoded payload to req.user.
 */
function authenticateToken(req, res, next) {
  // Prefer httpOnly cookie; fall back to Authorization header for API clients
  const token =
    req.cookies?.[COOKIE_NAME] ||
    (req.headers.authorization?.startsWith('Bearer ')
      ? req.headers.authorization.slice(7)
      : null);

  if (!token) {
    return res.status(401).json({
      error:   true,
      message: 'Authentication required.',
      code:    'UNAUTHENTICATED',
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // { userId, email, name, role, status }
    return next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({
        error:   true,
        message: 'Session expired. Please log in again.',
        code:    'SESSION_EXPIRED',
      });
    }
    logger.warn('Invalid JWT token presented', {
      ip:    req.ip,
      error: err.message,
    });
    return res.status(401).json({
      error:   true,
      message: 'Authentication required.',
      code:    'INVALID_TOKEN',
    });
  }
}

/**
 * requireApproved
 * Must be used after authenticateToken.
 * Blocks access if the user's account has not been approved by an admin.
 */
function requireApproved(req, res, next) {
  if (!req.user) {
    return res.status(401).json({
      error:   true,
      message: 'Authentication required.',
      code:    'UNAUTHENTICATED',
    });
  }

  if (req.user.status !== 'approved') {
    const message =
      req.user.status === 'rejected'
        ? 'Your account access has been denied. Contact your administrator.'
        : 'Your account is pending approval.';

    return res.status(403).json({
      error:   true,
      message,
      code:    'ACCOUNT_NOT_APPROVED',
    });
  }

  return next();
}

/**
 * requireAdmin
 * Must be used after authenticateToken.
 * Blocks access if the user does not have the 'admin' role.
 */
function requireAdmin(req, res, next) {
  if (!req.user) {
    return res.status(401).json({
      error:   true,
      message: 'Authentication required.',
      code:    'UNAUTHENTICATED',
    });
  }

  if (req.user.role !== 'admin') {
    return res.status(403).json({
      error:   true,
      message: 'Insufficient permissions.',
      code:    'FORBIDDEN',
    });
  }

  return next();
}

/**
 * Helper: sign a JWT for a given user record.
 * Stored in an httpOnly secure cookie on the response.
 */
function issueJwt(res, user) {
  const payload = {
    userId: user.id,
    email:  user.email,
    name:   user.name,
    role:   user.role,
    status: user.status,
  };

  const token = jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRY || '8h',
  });

  const isProduction = process.env.NODE_ENV === 'production';

  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    secure:   isProduction,
    sameSite: isProduction ? 'strict' : 'lax',
    maxAge:   8 * 60 * 60 * 1000, // 8 hours in ms
  });

  return token;
}

/**
 * Helper: clear the auth cookie on logout.
 */
function clearJwt(res) {
  res.clearCookie(COOKIE_NAME, {
    httpOnly: true,
    secure:   process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
  });
}

module.exports = {
  authenticateToken,
  requireApproved,
  requireAdmin,
  issueJwt,
  clearJwt,
  COOKIE_NAME,
};
