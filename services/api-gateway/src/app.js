const express = require('express');

const healthRouter = require('./routes/health');

const app = express();

app.use(express.json());

const SERVICE_PG_URL = process.env.SERVICE_PG_URL || 'http://service-pg:8081';
const SERVICE_MONGO_URL = process.env.SERVICE_MONGO_URL || 'http://service-mongo:8082';

app.get('/', (_req, res) => {
  res.json({
    service: 'api-gateway',
    message: 'Gateway działa operacyjnie! Ruch jest przekazywany do mikroserwisów.',
    routes: {
      health: '/health',
      users: '/users (routing do bazy PostgreSQL)',
      pg: '/api/pg',
      mongo: '/api/mongo',
    },
  });
});

app.use(healthRouter);

app.use('/users', async (req, res) => {
  try {
    const response = await fetch(`${SERVICE_PG_URL}/users`, {
      method: req.method,
      headers: {
        'Content-Type': 'application/json',
      },
      body: ['GET', 'HEAD'].includes(req.method) ? undefined : JSON.stringify(req.body)
    });

    const data = await response.json().catch(() => ({}));
    res.status(response.status).json(data);
  } catch (error) {
    console.error('Błąd API Gateway -> service-pg (/users):', error.message);
    res.status(502).json({ error: 'Bad Gateway: Brak odpowiedzi od service-pg' });
  }
});

app.use('/api/pg', async (req, res) => {
  try {
    const url = `${SERVICE_PG_URL}${req.url === '/' ? '' : req.url}`;
    const response = await fetch(url, {
      method: req.method,
      headers: { 'Content-Type': 'application/json' },
      body: ['GET', 'HEAD'].includes(req.method) ? undefined : JSON.stringify(req.body)
    });

    const data = await response.json().catch(() => ({}));
    res.status(response.status).json(data);
  } catch (error) {
    res.status(502).json({ error: 'Bad Gateway: Brak odpowiedzi od service-pg' });
  }
});

app.use('/api/mongo', async (req, res) => {
  try {
    const url = `${SERVICE_MONGO_URL}${req.url === '/' ? '' : req.url}`;
    const response = await fetch(url, {
      method: req.method,
      headers: { 'Content-Type': 'application/json' },
      body: ['GET', 'HEAD'].includes(req.method) ? undefined : JSON.stringify(req.body)
    });

    const data = await response.json().catch(() => ({}));
    res.status(response.status).json(data);
  } catch (error) {
    res.status(502).json({ error: 'Bad Gateway: Brak odpowiedzi od service-mongo' });
  }
});

app.use((_req, res) => {
  res.status(404).json({ error: 'Not found - API Gateway nie odnalazł ścieżki' });
});

module.exports = app;