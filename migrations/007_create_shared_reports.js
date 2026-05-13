// Migration 007 — Create shared_reports table
exports.up = async (knex) => {
  await knex.schema.createTable('shared_reports', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('report_id').references('id').inTable('report_definitions').onDelete('CASCADE').notNullable();
    t.uuid('shared_by').references('id').inTable('users').nullable();
    t.timestamp('shared_at', { useTz: true }).defaultTo(knex.fn.now());
    t.timestamp('expires_at', { useTz: true }).nullable();
  });

  await knex.schema.raw(`
    CREATE INDEX idx_shared_reports_report_id  ON shared_reports (report_id);
    CREATE INDEX idx_shared_reports_shared_by  ON shared_reports (shared_by);
  `);
};

exports.down = async (knex) => {
  await knex.schema.dropTableIfExists('shared_reports');
};
