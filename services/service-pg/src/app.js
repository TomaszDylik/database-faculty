const express = require('express');

const healthRouter = require('./routes/health');

const app = express();

app.use(express.json());

app.get('/', (_req, res) => {
  res.json({
    service: 'service-pg',
    database: 'postgresql',
    tools: ['prisma', 'knex', 'pg'],
    routes: {
      health: '/health',
    },
  });
});

app.use(healthRouter);

app.use((_req, res) => {
  res.status(404).json({ error: 'Not found' });
});

module.exports = app;
