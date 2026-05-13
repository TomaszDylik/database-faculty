exports.seed = async function seed(knex) {
  await knex('conversation_status_history').del();
  await knex('audit_logs_pg').del();
  await knex('conversations').del();
  await knex('users').del();

  const users = await knex('users')
    .insert([
      {
        email: 'jan@example.com',
        display_name: 'Janek',
      },
      {
        email: 'anna@example.com',
        display_name: 'Ania',
      },
    ])
    .returning(['id', 'email']);

  const anna = users.find((user) => user.email === 'anna@example.com');

  const conversations = await knex('conversations')
    .insert({
      title: 'Rozmowa 1',
      created_by_id: anna.id,
      status: 'ACTIVE',
    })
    .returning(['id']);

  const conversationId = conversations[0].id;

  await knex('audit_logs_pg').insert({
    entity_type: 'conversation',
    entity_id: conversationId,
    action: 'SEED_CREATED',
    payload: JSON.stringify({ source: 'knex-seed' }),
  });

  await knex('conversation_status_history').insert({
    conversation_id: conversationId,
    previous_status: null,
    next_status: 'ACTIVE',
  });
};