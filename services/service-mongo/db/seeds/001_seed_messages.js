const Message = require('../../src/models/Message');
const { connectMongoose, disconnectMongoose } = require('../../src/db/mongoose');

const seedIds = {
  memberUserId: '11111111-1111-4111-8111-111111111111',
  creatorUserId: '22222222-2222-4222-8222-222222222222',
  thirdUserId: '33333333-3333-4333-8333-333333333333',
  directConversationId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  groupConversationId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
};

const seedMessages = [
  {
    conversationId: seedIds.directConversationId,
    authorId: seedIds.creatorUserId,
    body: '1 seeded wiadomosc w rozmowie direct.',
    deliveryStatus: 'STORED',
    attachments: [],
    createdAt: new Date('2026-05-16T10:00:00.000Z'),
  },
  {
    conversationId: seedIds.directConversationId,
    authorId: seedIds.memberUserId,
    body: 'Odpowiedz w seeded rozmowie direct.',
    deliveryStatus: 'STORED',
    attachments: [],
    createdAt: new Date('2026-05-16T10:02:00.000Z'),
  },
  {
    conversationId: seedIds.groupConversationId,
    authorId: seedIds.creatorUserId,
    body: '1 seeded wiadomosc w grupie projektowej.',
    deliveryStatus: 'STORED',
    attachments: [],
    createdAt: new Date('2026-05-16T11:00:00.000Z'),
  },
  {
    conversationId: seedIds.groupConversationId,
    authorId: seedIds.memberUserId,
    body: '2 seeded wiadomosc w grupie z zalacznikiem testowym.',
    deliveryStatus: 'STORED',
    attachments: [
      {
        name: 'brief.txt',
        mimeType: 'text/plain',
        size: 128,
        storageKey: 'attachments/brief.txt',
      },
    ],
    createdAt: new Date('2026-05-16T11:03:00.000Z'),
  },
  {
    conversationId: seedIds.groupConversationId,
    authorId: seedIds.creatorUserId,
    body: '3 seeded wiadomosc w grupie.',
    deliveryStatus: 'RECEIVED',
    attachments: [],
    createdAt: new Date('2026-05-16T11:05:00.000Z'),
  },
];

async function runSeed() {
  await connectMongoose();
  await Message.init();

  await Message.deleteMany({
    conversationId: {
      $in: [seedIds.directConversationId, seedIds.groupConversationId],
    },
  });

  await Message.insertMany(seedMessages, { ordered: true });
}

runSeed()
  .catch((error) => {
    console.error('Mongo message seed failed.');
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    try {
      await disconnectMongoose();
    } catch (disconnectError) {
      console.error('Mongo disconnect failed.');
      console.error(disconnectError);
      process.exitCode = 1;
    }
  });