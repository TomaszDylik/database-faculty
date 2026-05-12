const express = require('express');

const knexDb = require('../db/knex');
const { query } = require('../db/pgPool');
const prisma = require('../db/prisma');

const router = express.Router();

router.get('/health', async (_req, res) => {
  try {
    await query('SELECT 1 AS pg_ok');
    await knexDb.raw('SELECT 1 AS knex_ok');
    await prisma.$queryRaw`SELECT 1 AS prisma_ok`;

    res.json({
      status: 'ok',
      service: 'service-pg',
      drivers: ['pg', 'knex', 'prisma'],
    });
  } catch (error) {
    res.status(503).json({
      status: 'error',
      service: 'service-pg',
      message: error.message,
    });
  }
});

module.exports = router;
