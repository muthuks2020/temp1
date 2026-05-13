// Migration 001 — Enable pgcrypto for gen_random_uuid()
exports.up = async (knex) => {
  await knex.raw('CREATE EXTENSION IF NOT EXISTS pgcrypto');
};

exports.down = async (knex) => {
  await knex.raw('DROP EXTENSION IF EXISTS pgcrypto');
};
