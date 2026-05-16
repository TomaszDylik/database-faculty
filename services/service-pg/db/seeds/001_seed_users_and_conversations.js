const seedIds = {
  memberUserId: '11111111-1111-4111-8111-111111111111',
  creatorUserId: '22222222-2222-4222-8222-222222222222',
  thirdUserId: '33333333-3333-4333-8333-333333333333',
  directConversationId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  groupConversationId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
};

exports.seed = async function seed(knex) {
  await knex('message_pointers').del();
  await knex('conversation_members').del();
  await knex('conversation_status_history').del();
  await knex('audit_logs_pg').del();
  await knex('conversations').del();
  await knex('users').del();

  await knex('users').insert([
    {
      id: seedIds.memberUserId,
      email: 'jan@example.com',
      display_name: 'Janek',
    },
    {
      id: seedIds.creatorUserId,
      email: 'anna@example.com',
      display_name: 'Ania',
    },
    {
      id: seedIds.thirdUserId,
      email: 'ola@example.com',
      display_name: 'Ola',
    },
  ]);

  await knex('conversations').insert([
    {
      id: seedIds.directConversationId,
      title: null,
      type: 'DIRECT',
      created_by_id: seedIds.creatorUserId,
      status: 'ACTIVE',
    },
    {
      id: seedIds.groupConversationId,
      title: 'Projekt zespolowy',
      type: 'GROUP',
      created_by_id: seedIds.creatorUserId,
      status: 'ACTIVE',
    },
  ]);

  await knex('conversation_members').insert([
    {
      conversation_id: seedIds.directConversationId,
      user_id: seedIds.creatorUserId,
      role: 'OWNER',
    },
    {
      conversation_id: seedIds.directConversationId,
      user_id: seedIds.memberUserId,
      role: 'MEMBER',
    },
    {
      conversation_id: seedIds.groupConversationId,
      user_id: seedIds.creatorUserId,
      role: 'OWNER',
    },
    {
      conversation_id: seedIds.groupConversationId,
      user_id: seedIds.memberUserId,
      role: 'MEMBER',
    },
  ]);

  await knex('audit_logs_pg').insert([
    {
      entity_type: 'conversation',
      entity_id: seedIds.directConversationId,
      action: 'SEED_CREATED',
      payload: JSON.stringify({ source: 'knex-seed', type: 'DIRECT' }),
    },
    {
      entity_type: 'conversation',
      entity_id: seedIds.groupConversationId,
      action: 'SEED_CREATED',
      payload: JSON.stringify({ source: 'knex-seed', type: 'GROUP' }),
    },
  ]);

  await knex('conversation_status_history').insert([
    {
      conversation_id: seedIds.directConversationId,
      previous_status: null,
      next_status: 'ACTIVE',
    },
    {
      conversation_id: seedIds.groupConversationId,
      previous_status: null,
      next_status: 'ACTIVE',
    },
  ]);
};
