require('dotenv').config();

const app = require('./app');
const { port } = require('./config/env');
const knexDb = require('./db/knex');
const { end } = require('./db/pgPool');
const prisma = require('./db/prisma');
const { closeSequelize } = require('./db/sequelize');

const server = app.listen(port, () => {
  console.log(`service-pg listening on port ${port}`);
});

let shuttingDown = false;

async function shutdown(signal) {
  if (shuttingDown) {
    return;
  }

  shuttingDown = true;
  console.log(`service-pg received ${signal}, shutting down`);

  server.close(async () => {
    await Promise.allSettled([
      prisma.$disconnect(),
      knexDb.destroy(),
      end(),
      closeSequelize(),
    ]);
    process.exit(0);
  });

  setTimeout(() => process.exit(1), 10000).unref();
}

['SIGINT', 'SIGTERM'].forEach((signal) => {
  process.once(signal, () => {
    void shutdown(signal);
  });
});
