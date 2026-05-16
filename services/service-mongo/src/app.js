const express = require('express');

const healthRouter = require('./routes/health');
const messagesRouter = require('./routes/messages');

const app = express();

app.use(express.json());

app.get('/', (_req, res) => {
  res.json({
    service: 'service-mongo',
    message: 'Serwis Mongo ma skonfigurowany native driver, Mongoose i model Message.',
    tools: ['mongodb-native-driver', 'mongoose'],
    routes: {
      health: '/health',
      messages: '/messages',
    },
  });
});

app.use(healthRouter);
app.use(messagesRouter);

app.use((_req, res) => {
  res.status(404).json({ error: 'Not found' });
});

module.exports = app;
