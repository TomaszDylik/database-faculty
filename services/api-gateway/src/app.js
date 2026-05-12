const express = require('express');

const healthRouter = require('./routes/health');

const app = express();

app.use(express.json());

app.get('/', (_req, res) => {
  res.json({
    service: 'api-gateway',
    message: 'Gateway gotowy, routing biznesowy bedzie dodawany w kolejnych krokach.',
    routes: {
      health: '/health',
      pg: '/api/pg',
      mongo: '/api/mongo',
    },
  });
});

app.use(healthRouter);

app.use('/api/pg', (_req, res) => {
  res.status(501).json({
    error: 'Routing do service-pg nie jest jeszcze zaimplementowany.',
  });
});

app.use('/api/mongo', (_req, res) => {
  res.status(501).json({
    error: 'Routing do service-mongo nie jest jeszcze zaimplementowany.',
  });
});

app.use((_req, res) => {
  res.status(404).json({ error: 'Not found' });
});

module.exports = app;
