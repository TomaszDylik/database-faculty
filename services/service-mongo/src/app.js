const express = require('express');

const healthRouter = require('./routes/health');

const app = express();

app.use(express.json());

app.get('/', (_req, res) => {
  res.json({
    service: 'service-mongo',
    message: 'Szkielet serwisu Mongo jest gotowy. Modele i klient bazy beda dodane później.',
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
