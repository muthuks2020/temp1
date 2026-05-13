// routes/admin.js — Admin management routes
'use strict';

const express = require('express');
const router = express.Router();
const { body, query } = require('express-validator');

const { authenticateToken, requireAdmin } = require('../middleware/auth');
const { validateRequest, isUuidParam } = require('../middleware/validation');
const adminController = require('../controllers/adminController');

// All admin routes require authentication + admin role
router.use(authenticateToken, requireAdmin);

/**
 * GET /api/v1/admin/users/pending
 * List all users with status = 'pending'.
 */
router.get('/users/pending', adminController.getPendingUsers);

/**
 * POST /api/v1/admin/users/:id/approve
 * Approve a pending user account.
 */
router.post(
  '/users/:id/approve',
  validateRequest([isUuidParam('id')]),
  adminController.approveUser
);

/**
 * POST /api/v1/admin/users/:id/reject
 * Reject a user account. Reason is required (min 10 chars).
 */
router.post(
  '/users/:id/reject',
  validateRequest([
    isUuidParam('id'),
    body('reason')
      .trim()
      .notEmpty()
      .withMessage('Rejection reason is required.')
      .isLength({ min: 10 })
      .withMessage('Rejection reason must be at least 10 characters.'),
  ]),
  adminController.rejectUser
);

/**
 * GET /api/v1/admin/users
 * List all users with pagination and optional status filter.
 */
router.get(
  '/users',
  validateRequest([
    query('page')
      .optional()
      .isInt({ min: 1 })
      .withMessage('page must be a positive integer'),
    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage('limit must be between 1 and 100'),
    query('status')
      .optional()
      .isIn(['pending', 'approved', 'rejected'])
      .withMessage('status must be pending, approved, or rejected'),
  ]),
  adminController.getAllUsers
);

module.exports = router;
