const express = require('express');

const conversationsRouter = require('./routes/conversations');
const healthRouter = require('./routes/health');
const usersRouter = require('./routes/users');

const app = express();

app.use(express.json());

app.get('/', (_req, res) => {
  res.json({
    service: 'service-pg',
    database: 'postgresql',
    tools: ['prisma', 'knex', 'pg', 'sequelize'],
    routes: {
      health: '/health',
      users: '/users',
      userConversations: '/users/:userId/conversations',
      conversations: '/conversations',
      addConversationMember: '/conversations/:conversationId/members',
    },
  });
});

app.use(healthRouter);
app.use(usersRouter);
app.use(conversationsRouter);

app.use((_req, res) => {
  res.status(404).json({ error: 'Not found' });
});

module.exports = app;
