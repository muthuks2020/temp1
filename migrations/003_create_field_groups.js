// Migration 003 — Create field_groups table
exports.up = async (knex) => {
  await knex.schema.createTable('field_groups', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.text('name').unique().notNullable();
    t.text('color').notNullable().defaultTo('#6366f1');
    t.text('description').nullable();
    t.integer('sort_order').defaultTo(0);
    t.boolean('is_active').defaultTo(true);
    t.timestamp('created_at', { useTz: true }).defaultTo(knex.fn.now());
    t.timestamp('updated_at', { useTz: true }).defaultTo(knex.fn.now());
  });
};

exports.down = async (knex) => {
  await knex.schema.dropTableIfExists('field_groups');
};
