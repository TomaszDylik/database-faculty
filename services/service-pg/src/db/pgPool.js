const { Pool } = require('pg');

const { databaseUrl } = require('../config/env');

const globalForPg = global;

const pool = globalForPg.__pgPool || new Pool({
  connectionString: databaseUrl,
  max: 10,
  idleTimeoutMillis: 10000,
  connectionTimeoutMillis: 3000,
});

if (process.env.NODE_ENV !== 'production') {
  globalForPg.__pgPool = pool;
}

async function query(text, params) {
  return pool.query(text, params);
}

async function end() {
  await pool.end();
}

module.exports = {
  pool,
  query,
  end,
};
