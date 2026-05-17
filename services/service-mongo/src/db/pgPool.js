const { Pool } = require('pg');

const { databaseUrl } = require('../config/env');

const globalForPg = global;

const pool = globalForPg.__serviceMongoPgPool || new Pool({
  connectionString: databaseUrl,
  max: 10,
  idleTimeoutMillis: 10000,
  connectionTimeoutMillis: 3000,
});

if (process.env.NODE_ENV !== 'production') {
  globalForPg.__serviceMongoPgPool = pool;
}

async function query(text, params) {
  return pool.query(text, params);
}

async function withPgClient(callback) {
  const client = await pool.connect();

  try {
    return await callback(client);
  } finally {
    client.release();
  }
}

async function end() {
  await pool.end();
}

module.exports = {
  pool,
  query,
  withPgClient,
  end,
};