// controllers/authController.js — Auth route handlers
'use strict';

const passport = require('passport');
const logger = require('../config/logger');
const { issueJwt, clearJwt } = require('../middleware/auth');

/**
 * GET /auth/login
 * Redirect to Microsoft login via passport-azure-ad.
 */
function login(req, res, next) {
  passport.authenticate('azuread-openidconnect', {
    session:      false,
    failureRedirect: '/auth/login?error=auth_failed',
  })(req, res, next);
}

/**
 * GET /auth/callback
 * Azure AD redirects here after authentication.
 * - Pending users  → 403
 * - Rejected users → 403
 * - Approved users → JWT cookie issued, redirect to frontend
 */
function callback(req, res, next) {
  passport.authenticate(
    'azuread-openidconnect',
    { session: false },
    (err, user, info) => {
      if (err) {
        logger.error('Auth callback error', { error: err.message, stack: err.stack });
        return res.status(500).json({
          error:   true,
          message: 'Authentication failed due to a server error.',
          code:    'AUTH_ERROR',
        });
      }

      if (!user) {
        const message =
          (info && info.message) ||
          'Authentication failed. Please try again.';
        logger.warn('Auth callback — no user', { info });
        return res.status(401).json({
          error:   true,
          message,
          code:    'AUTH_FAILED',
        });
      }

      // Pending account
      if (user.status === 'pending') {
        return res.status(403).json({
          error:   true,
          message:
            'Your account is pending admin approval. You will be notified once approved.',
          code:    'ACCOUNT_PENDING',
        });
      }

      // Rejected account
      if (user.status === 'rejected') {
        return res.status(403).json({
          error:   true,
          message: 'Your account access has been denied. Contact your administrator.',
          code:    'ACCOUNT_REJECTED',
        });
      }

      // Approved — issue JWT in httpOnly cookie
      issueJwt(res, user);

      logger.info('User logged in', { userId: user.id, email: user.email });

      // Redirect to frontend app after successful login
      const frontendUrl = process.env.FRONTEND_URL || '/';
      return res.redirect(frontendUrl);
    }
  )(req, res, next);
}

/**
 * GET /auth/logout
 * Clears the auth cookie and ends the session.
 */
function logout(req, res) {
  const email = req.user?.email;
  clearJwt(res);

  // Destroy passport session if present
  if (req.session) {
    req.session.destroy(() => {});
  }

  logger.info('User logged out', { email: email || 'unknown' });

  return res.json({ success: true, message: 'Logged out successfully.' });
}

/**
 * GET /auth/me
 * Returns the current user from the decoded JWT.
 * Requires authenticateToken middleware.
 */
function me(req, res) {
  const { userId, email, name, role, status } = req.user;
  return res.json({
    id:     userId,
    email,
    name,
    role,
    status,
  });
}

module.exports = { login, callback, logout, me };
