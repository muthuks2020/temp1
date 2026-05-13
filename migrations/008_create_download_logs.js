// Migration 008 — Create download_logs table
exports.up = async (knex) => {
  await knex.schema.createTable('download_logs', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('user_id').references('id').inTable('users').nullable();
    t.text('user_name').notNullable();
    t.text('email').notNullable();
    t.specificType('ip_address', 'INET').notNullable();
    t.text('report_name').notNullable();
    t.jsonb('field_ids').notNullable();
    t.jsonb('filters').defaultTo('{}');
    t.integer('row_count').nullable();
    t.integer('file_size_bytes').nullable();
    t.timestamp('downloaded_at', { useTz: true }).defaultTo(knex.fn.now());
  });

  await knex.schema.raw(`
    CREATE INDEX idx_download_logs_user_id       ON download_logs (user_id);
    CREATE INDEX idx_download_logs_downloaded_at ON download_logs (downloaded_at);
    CREATE INDEX idx_download_logs_email         ON download_logs (email);
  `);
};

exports.down = async (knex) => {
  await knex.schema.dropTableIfExists('download_logs');
};
