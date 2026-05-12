const express = require('express');

const { mongoUri } = require('../config/env');

const router = express.Router();

router.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'service-mongo',
    mongoConfigured: Boolean(mongoUri),
    note: 'Polaczenie z MongoDB zostanie dodane w kroku 3.',
  });
});

module.exports = router;
