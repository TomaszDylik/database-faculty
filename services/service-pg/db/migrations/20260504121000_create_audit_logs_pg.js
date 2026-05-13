exports.up = async function up(knex) {
  await knex.raw('CREATE EXTENSION IF NOT EXISTS "pgcrypto"');

  await knex.schema.createTable('audit_logs_pg', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.string('entity_type', 80).notNullable();
    table.uuid('entity_id').notNullable();
    table.string('action', 80).notNullable();
    table.jsonb('payload').notNullable().defaultTo('{}');
    table.timestamp('created_at', { useTz: false }).notNullable().defaultTo(knex.fn.now());
  });
};

exports.down = async function down(knex) {
  await knex.schema.dropTableIfExists('audit_logs_pg');
};
