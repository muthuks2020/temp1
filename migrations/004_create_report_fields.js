// Migration 004 — Create report_fields table
exports.up = async (knex) => {
  await knex.schema.createTable('report_fields', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.text('field_key').unique().notNullable();
    t.text('label').notNullable();
    t.uuid('group_id').references('id').inTable('field_groups').onDelete('CASCADE').nullable();
    t.text('sql_expression').notNullable();
    t.text('join_group').nullable();                          // null = base table
    t.text('data_type').defaultTo('text');                   // 'text'|'number'|'date'|'boolean'
    t.boolean('is_aggregatable').defaultTo(false);
    t.boolean('is_active').defaultTo(true);
    t.integer('sort_order').defaultTo(0);
    t.timestamp('created_at', { useTz: true }).defaultTo(knex.fn.now());
    t.timestamp('updated_at', { useTz: true }).defaultTo(knex.fn.now());
  });

  await knex.schema.raw(`
    CREATE INDEX idx_report_fields_field_key  ON report_fields (field_key);
    CREATE INDEX idx_report_fields_group_id   ON report_fields (group_id);
    CREATE INDEX idx_report_fields_is_active  ON report_fields (is_active);
  `);
};

exports.down = async (knex) => {
  await knex.schema.dropTableIfExists('report_fields');
};
