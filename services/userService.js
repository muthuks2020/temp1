// services/userService.js — User data access and business logic
'use strict';

const { db } = require('../config/database');
const logger = require('../config/logger');

/**
 * Find a user by their internal UUID.
 * @returns {object|null}
 */
async function findById(id) {
  const user = await db('users').where({ id }).first();
  return user || null;
}

/**
 * Find a user by email address.
 * @returns {object|null}
 */
async function findByEmail(email) {
  const user = await db('users')
    .where(db.raw('LOWER(email) = LOWER(?)', [email]))
    .first();
  return user || null;
}

/**
 * Upsert a user record from Azure AD callback.
 * - If the Azure OID already exists → update name and email (in case they changed in Azure).
 * - If new → insert with status 'pending'.
 * @returns {object} The upserted user record
 */
async function upsertAzureUser({ azureOid, email, name }) {
  const existing = await db('users').where({ azure_oid: azureOid }).first();

  if (existing) {
    const [updated] = await db('users')
      .where({ azure_oid: azureOid })
      .update({
        name,
        email: email.toLowerCase(),
        updated_at: db.fn.now(),
      })
      .returning('*');
    return updated;
  }

  const [inserted] = await db('users')
    .insert({
      azure_oid: azureOid,
      name,
      email: email.toLowerCase(),
      role:   'user',
      status: 'pending',
    })
    .returning('*');

  logger.info('New user registered — pending approval', {
    userId: inserted.id,
    email:  inserted.email,
  });

  return inserted;
}

/**
 * Approve a user account.
 * @param {string} userId       - UUID of the user to approve
 * @param {string} adminUserId  - UUID of the admin performing the action
 * @returns {object} Updated user record
 */
async function approveUser(userId, adminUserId) {
  const [updated] = await db('users')
    .where({ id: userId })
    .update({
      status:      'approved',
      approved_by: adminUserId,
      approved_at: db.fn.now(),
      updated_at:  db.fn.now(),
    })
    .returning('*');
  return updated;
}

/**
 * Reject a user account.
 * @param {string} userId - UUID of the user to reject
 * @returns {object} Updated user record
 */
async function rejectUser(userId) {
  const [updated] = await db('users')
    .where({ id: userId })
    .update({
      status:     'rejected',
      updated_at: db.fn.now(),
    })
    .returning('*');
  return updated;
}

/**
 * List users with optional status filter and pagination.
 * @param {object} options - { status, page, limit }
 * @returns {{ users: object[], total: number }}
 */
async function listUsers({ status, page = 1, limit = 20 } = {}) {
  const offset = (page - 1) * limit;

  const query = db('users').select(
    'id', 'name', 'email', 'role', 'status',
    'approved_by', 'approved_at', 'created_at', 'updated_at'
  );

  if (status) {
    query.where({ status });
  }

  const [{ count }] = await query.clone().count('id as count');
  const users = await query.orderBy('created_at', 'desc').limit(limit).offset(offset);

  return { users, total: parseInt(count, 10) };
}

/**
 * List users with status = 'pending'.
 * @returns {object[]}
 */
async function listPendingUsers() {
  return db('users')
    .select('id', 'name', 'email', 'created_at')
    .where({ status: 'pending' })
    .orderBy('created_at', 'asc');
}

module.exports = {
  findById,
  findByEmail,
  upsertAzureUser,
  approveUser,
  rejectUser,
  listUsers,
  listPendingUsers,
};
