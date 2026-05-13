exports.up = async function up(knex) {
  await knex.raw('CREATE EXTENSION IF NOT EXISTS "pgcrypto"');

  await knex.schema.createTable('conversation_status_history', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('conversation_id').notNullable().references('id').inTable('conversations').onDelete('CASCADE');
    table.string('previous_status', 30).nullable();
    table.string('next_status', 30).notNullable();
    table.timestamp('changed_at', { useTz: false }).notNullable().defaultTo(knex.fn.now());
  });
};

exports.down = async function down(knex) {
  await knex.schema.dropTableIfExists('conversation_status_history');
};
