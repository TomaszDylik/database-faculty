require('dotenv').config();

const app = require('./app');
const { port } = require('./config/env');
const { closeMongoClient, getDatabase } = require('./db/mongoClient');
const { connectMongoose, disconnectMongoose } = require('./db/mongoose');
const { end: closePgPool, query: queryPg } = require('./db/pgPool');
const Message = require('./models/Message');

let server;
let shuttingDown = false;

async function shutdown(signal) {
  if (shuttingDown) {
    return;
  }

  shuttingDown = true;
  console.log(`service-mongo received ${signal}, shutting down`);

  if (!server) {
    await Promise.allSettled([disconnectMongoose(), closeMongoClient(), closePgPool()]);
    process.exit(0);
  }

  server.close(async () => {
    await Promise.allSettled([disconnectMongoose(), closeMongoClient(), closePgPool()]);
    process.exit(0);
  });

  setTimeout(() => process.exit(1), 10000).unref();
}

async function startServer() {
  await connectMongoose();
  const database = await getDatabase();
  await database.command({ ping: 1 });
  await queryPg('SELECT 1 AS pg_ok');
  await Message.init();

  server = app.listen(port, () => {
    console.log(`service-mongo listening on port ${port}`);
  });
}

['SIGINT', 'SIGTERM'].forEach((signal) => {
  process.once(signal, () => {
    void shutdown(signal);
  });
});

void startServer().catch((error) => {
  console.error('service-mongo failed to start', error);
  process.exit(1);
});
