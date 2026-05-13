// routes/auth.js — Authentication routes
'use strict';

const express = require('express');
const router = express.Router();

const { authLimiter } = require('../middleware/rateLimiter');
const { authenticateToken } = require('../middleware/auth');
const authController = require('../controllers/authController');

// Apply strict rate limiting to all auth routes
router.use(authLimiter);

/**
 * GET /auth/login
 * Initiates Microsoft Azure AD OIDC login redirect.
 */
router.get('/login', authController.login);

/**
 * GET /auth/callback
 * Azure AD redirects here with the auth code.
 * passport-azure-ad handles token exchange and profile extraction.
 */
router.get('/callback', authController.callback);

/**
 * GET /auth/logout
 * Clears the JWT cookie and logs the user out.
 * authenticateToken is best-effort here — we clear the cookie regardless.
 */
router.get('/logout', authController.logout);

/**
 * GET /auth/me
 * Returns current user from JWT. Protected.
 */
router.get('/me', authenticateToken, authController.me);

module.exports = router;
