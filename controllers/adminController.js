// controllers/adminController.js — Admin route handlers
'use strict';

const logger = require('../config/logger');
const userService = require('../services/userService');

/**
 * GET /api/v1/admin/users/pending
 * Returns all users with status = 'pending'.
 * Requires: admin role.
 */
async function getPendingUsers(req, res) {
  try {
    const users = await userService.listPendingUsers();
    return res.json({ users, count: users.length });
  } catch (err) {
    logger.error('getPendingUsers error', { error: err.message, stack: err.stack });
    return res.status(500).json({
      error:   true,
      message: 'An unexpected error occurred. Please try again.',
      code:    'INTERNAL_ERROR',
    });
  }
}

/**
 * POST /api/v1/admin/users/:id/approve
 * Approves a pending user.
 * Requires: admin role.
 */
async function approveUser(req, res) {
  try {
    const { id } = req.params;

    const user = await userService.findById(id);
    if (!user) {
      return res.status(404).json({
        error:   true,
        message: 'User not found.',
        code:    'USER_NOT_FOUND',
      });
    }

    if (user.status === 'approved') {
      return res.status(400).json({
        error:   true,
        message: 'User is already approved.',
        code:    'ALREADY_APPROVED',
      });
    }

    const updated = await userService.approveUser(id, req.user.userId);

    logger.info('Admin approved user', {
      adminEmail:  req.user.email,
      targetEmail: updated.email,
      targetId:    updated.id,
    });

    return res.json({ user: updated });
  } catch (err) {
    logger.error('approveUser error', { error: err.message, stack: err.stack });
    return res.status(500).json({
      error:   true,
      message: 'An unexpected error occurred. Please try again.',
      code:    'INTERNAL_ERROR',
    });
  }
}

/**
 * POST /api/v1/admin/users/:id/reject
 * Rejects a pending user. Requires a reason in the request body.
 * Requires: admin role.
 */
async function rejectUser(req, res) {
  try {
    const { id } = req.params;

    const user = await userService.findById(id);
    if (!user) {
      return res.status(404).json({
        error:   true,
        message: 'User not found.',
        code:    'USER_NOT_FOUND',
      });
    }

    if (user.status === 'rejected') {
      return res.status(400).json({
        error:   true,
        message: 'User is already rejected.',
        code:    'ALREADY_REJECTED',
      });
    }

    const updated = await userService.rejectUser(id);

    logger.info('Admin rejected user', {
      adminEmail:  req.user.email,
      targetEmail: updated.email,
      targetId:    updated.id,
      reason:      req.body.reason,
    });

    return res.json({ user: updated });
  } catch (err) {
    logger.error('rejectUser error', { error: err.message, stack: err.stack });
    return res.status(500).json({
      error:   true,
      message: 'An unexpected error occurred. Please try again.',
      code:    'INTERNAL_ERROR',
    });
  }
}

/**
 * GET /api/v1/admin/users
 * Returns all users with pagination and optional status filter.
 * Requires: admin role.
 */
async function getAllUsers(req, res) {
  try {
    const page   = Math.max(1, parseInt(req.query.page  || '1',  10));
    const limit  = Math.min(100, Math.max(1, parseInt(req.query.limit || '20', 10)));
    const status = req.query.status || null;

    const { users, total } = await userService.listUsers({ status, page, limit });

    return res.json({
      users,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    logger.error('getAllUsers error', { error: err.message, stack: err.stack });
    return res.status(500).json({
      error:   true,
      message: 'An unexpected error occurred. Please try again.',
      code:    'INTERNAL_ERROR',
    });
  }
}

module.exports = { getPendingUsers, approveUser, rejectUser, getAllUsers };
