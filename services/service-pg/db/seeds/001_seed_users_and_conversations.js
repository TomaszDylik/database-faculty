exports.seed = async function seed(knex) {
  await knex('message_pointers').del();
  await knex('conversation_members').del();
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
      {
        email: 'ola@example.com',
        display_name: 'Ola',
      },
    ])
    .returning(['id', 'email']);

  const jan = users.find((user) => user.email === 'jan@example.com');
  const anna = users.find((user) => user.email === 'anna@example.com');
  const ola = users.find((user) => user.email === 'ola@example.com');

  const conversations = await knex('conversations')
    .insert([
      {
        title: null,
        type: 'DIRECT',
        created_by_id: anna.id,
        status: 'ACTIVE',
      },
      {
        title: 'Projekt zespolowy',
        type: 'GROUP',
        created_by_id: anna.id,
        status: 'ACTIVE',
      },
    ])
    .returning(['id', 'type']);

  const directConversation = conversations.find((conversation) => conversation.type === 'DIRECT');
  const groupConversation = conversations.find((conversation) => conversation.type === 'GROUP');

  await knex('conversation_members').insert([
    {
      conversation_id: directConversation.id,
      user_id: anna.id,
      role: 'OWNER',
    },
    {
      conversation_id: groupConversation.id,
      user_id: jan.id,
      role: 'ADMIN',
    },
    {
      conversation_id: groupConversation.id,
      user_id: ola.id,
      role: 'MEMBER',
    },
  ]);

  await knex('audit_logs_pg').insert([
    {
      entity_type: 'conversation',
      entity_id: directConversation.id,
      action: 'SEED_CREATED',
      payload: JSON.stringify({ source: 'knex-seed', type: 'DIRECT' }),
    },
    {
      entity_type: 'conversation',
      entity_id: groupConversation.id,
      action: 'SEED_CREATED',
      payload: JSON.stringify({ source: 'knex-seed', type: 'GROUP' }),
    },
  ]);

  await knex('conversation_status_history').insert([
    {
      conversation_id: directConversation.id,
      previous_status: null,
      next_status: 'ACTIVE',
    },
    {
      conversation_id: groupConversation.id,
      previous_status: null,
      next_status: 'ACTIVE',
    },
  ]);
};
