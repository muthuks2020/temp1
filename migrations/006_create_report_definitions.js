// Migration 006 — Create report_definitions table
exports.up = async (knex) => {
  await knex.schema.createTable('report_definitions', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.text('name').notNullable();
    t.uuid('created_by').references('id').inTable('users').onDelete('CASCADE').notNullable();
    t.uuid('combination_id').references('id').inTable('saved_field_combinations').nullable();
    t.jsonb('field_ids').notNullable();
    t.jsonb('filters').defaultTo('{}');
    t.integer('row_count').nullable();
    t.text('file_path').nullable();                           // stored CSV path on server
    t.boolean('is_shared').defaultTo(false);
    t.timestamp('shared_at', { useTz: true }).nullable();
    t.timestamp('created_at', { useTz: true }).defaultTo(knex.fn.now());
  });

  await knex.schema.raw(`
    CREATE INDEX idx_report_definitions_created_by ON report_definitions (created_by);
    CREATE INDEX idx_report_definitions_is_shared  ON report_definitions (is_shared);
    CREATE INDEX idx_report_definitions_created_at ON report_definitions (created_at);
  `);
};

exports.down = async (knex) => {
  await knex.schema.dropTableIfExists('report_definitions');
};
