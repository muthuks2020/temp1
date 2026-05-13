// Migration 005 — Create saved_field_combinations table
exports.up = async (knex) => {
  await knex.schema.createTable('saved_field_combinations', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.text('name').notNullable();
    t.text('description').nullable();
    t.uuid('created_by').references('id').inTable('users').onDelete('CASCADE').notNullable();
    t.jsonb('field_ids').notNullable();                       // ordered array of field_key strings
    t.jsonb('filters').defaultTo('{}');
    t.boolean('is_shared').defaultTo(true);
    t.timestamp('created_at', { useTz: true }).defaultTo(knex.fn.now());
    t.timestamp('updated_at', { useTz: true }).defaultTo(knex.fn.now());
  });

  await knex.schema.raw(`
    CREATE INDEX idx_saved_combinations_created_by ON saved_field_combinations (created_by);
    CREATE INDEX idx_saved_combinations_is_shared  ON saved_field_combinations (is_shared);
  `);
};

exports.down = async (knex) => {
  await knex.schema.dropTableIfExists('saved_field_combinations');
};
