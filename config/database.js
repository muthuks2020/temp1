// config/database.js — Knex singleton with connection health check
'use strict';

const knex = require('knex');
const knexfile = require('../knexfile');
const logger = require('./logger');

const env = process.env.NODE_ENV || 'development';
const config = knexfile[env];

if (!config) {
  logger.error(`No Knex config found for environment: ${env}`);
  process.exit(1);
}

const db = knex(config);

/**
 * Verify database connectivity. Throws if unreachable.
 * Called during server startup — process exits on failure.
 */
async function checkDatabaseConnection() {
  try {
    await db.raw('SELECT 1');
    logger.info('Database connection established successfully');
  } catch (err) {
    logger.error('Database connection failed', {
      error: err.message,
      host: config.connection.host,
      database: config.connection.database,
    });
    throw err;
  }
}

module.exports = { db, checkDatabaseConnection };
