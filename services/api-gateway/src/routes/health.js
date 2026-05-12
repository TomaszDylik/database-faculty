const express = require('express');

const { servicePgUrl, serviceMongoUrl } = require('../config/env');

const router = express.Router();

async function probeService(name, url) {
  try {
    const response = await fetch(`${url}/health`, {
      signal: AbortSignal.timeout(2000),
    });
    const payload = await response.json().catch(() => null);

    return {
      name,
      ok: response.ok,
      statusCode: response.status,
      payload,
    };
  } catch (error) {
    return {
      name,
      ok: false,
      error: error.message,
    };
  }
}

router.get('/health', async (_req, res) => {
  const dependencies = await Promise.all([
    probeService('service-pg', servicePgUrl),
    probeService('service-mongo', serviceMongoUrl),
  ]);
  const healthy = dependencies.every((dependency) => dependency.ok);

  res.status(healthy ? 200 : 503).json({
    status: healthy ? 'ok' : 'degraded',
    service: 'api-gateway',
    dependencies,
  });
});

module.exports = router;
