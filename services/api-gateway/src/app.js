const express = require('express');
const cors = require('cors');
const { auth } = require('express-oauth2-jwt-bearer');

const healthRouter = require('./routes/health');

const app = express();

const corsOptions = {
  origin: 'http://localhost:5173',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));
app.use(express.json());

const jwtCheck = auth({
  issuerBaseURL: 'http://keycloak:8080/realms/chat-realm',
  issuer: 'http://localhost:8080/realms/chat-realm',
  audience: 'react-frontend',
});

function jwtUnlessOptions(req, res, next) {
  if (req.method === 'OPTIONS') {
    return next();
  }
  return jwtCheck(req, res, next);
}

function requireAdmin(req, res, next) {
  const roles = req.auth?.payload?.realm_access?.roles ?? [];
  if (!roles.includes('admin')) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  next();
}

const SERVICE_PG_URL = process.env.SERVICE_PG_URL || 'http://service-pg:8081';
const SERVICE_MONGO_URL = process.env.SERVICE_MONGO_URL || 'http://service-mongo:8082';

app.use(healthRouter);

app.get('/', jwtUnlessOptions, (_req, res) => {
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

app.use('/users', jwtUnlessOptions, (req, res, next) => {
  if (req.method === 'POST') {
    return requireAdmin(req, res, next);
  }
  next();
}, async (req, res) => {
  try {
    const response = await fetch(`${SERVICE_PG_URL}/users`, {
      method: req.method,
      headers: {
        'Content-Type': 'application/json',
      },
      body: ['GET', 'HEAD'].includes(req.method) ? undefined : JSON.stringify(req.body),
    });

    const data = await response.json().catch(() => ({}));
    res.status(response.status).json(data);
  } catch (error) {
    console.error('Błąd API Gateway -> service-pg (/users):', error.message);
    res.status(502).json({ error: 'Bad Gateway: Brak odpowiedzi od service-pg' });
  }
});

app.use('/api/pg', jwtUnlessOptions, async (req, res) => {
  try {
    const url = `${SERVICE_PG_URL}${req.url === '/' ? '' : req.url}`;
    const response = await fetch(url, {
      method: req.method,
      headers: { 'Content-Type': 'application/json' },
      body: ['GET', 'HEAD'].includes(req.method) ? undefined : JSON.stringify(req.body),
    });

    const data = await response.json().catch(() => ({}));
    res.status(response.status).json(data);
  } catch (error) {
    res.status(502).json({ error: 'Bad Gateway: Brak odpowiedzi od service-pg' });
  }
});

app.use('/api/mongo', jwtUnlessOptions, async (req, res) => {
  try {
    const url = `${SERVICE_MONGO_URL}${req.url === '/' ? '' : req.url}`;
    const response = await fetch(url, {
      method: req.method,
      headers: { 'Content-Type': 'application/json' },
      body: ['GET', 'HEAD'].includes(req.method) ? undefined : JSON.stringify(req.body),
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

app.use((err, req, res, next) => {
  if (err.name === 'UnauthorizedError') {
    console.error('Błąd autoryzacji JWT:', err.message);
    return res.status(401).json({ error: 'Unauthorized', details: err.message });
  }
  next(err);
});

module.exports = app;
