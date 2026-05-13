// Migration 002 — Create users table
exports.up = async (knex) => {
  await knex.schema.createTable('users', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.text('azure_oid').unique().notNullable();
    t.text('name').notNullable();
    t.text('email').unique().notNullable();
    t.text('role').notNullable().defaultTo('user');           // 'admin' | 'user'
    t.text('status').notNullable().defaultTo('pending');      // 'pending' | 'approved' | 'rejected'
    t.uuid('approved_by').references('id').inTable('users').nullable();
    t.timestamp('approved_at', { useTz: true }).nullable();
    t.timestamp('created_at', { useTz: true }).defaultTo(knex.fn.now());
    t.timestamp('updated_at', { useTz: true }).defaultTo(knex.fn.now());
  });

  await knex.schema.raw(`
    CREATE INDEX idx_users_email     ON users (email);
    CREATE INDEX idx_users_azure_oid ON users (azure_oid);
    CREATE INDEX idx_users_status    ON users (status);
  `);
};

exports.down = async (knex) => {
  await knex.schema.dropTableIfExists('users');
};
