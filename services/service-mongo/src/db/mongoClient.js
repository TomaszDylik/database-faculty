const { MongoClient } = require('mongodb');

const { mongoUri, mongoServerSelectionTimeoutMs } = require('../config/env');

const globalForMongo = global;

function createMongoClient() {
  return new MongoClient(mongoUri, {
    maxPoolSize: 10,
    serverSelectionTimeoutMS: mongoServerSelectionTimeoutMs,
  });
}

async function getMongoClient() {
  if (!globalForMongo.__mongoClient) {
    globalForMongo.__mongoClient = createMongoClient();
  }

  if (!globalForMongo.__mongoClientPromise) {
    globalForMongo.__mongoClientPromise = globalForMongo.__mongoClient.connect();
  }

  await globalForMongo.__mongoClientPromise;
  return globalForMongo.__mongoClient;
}

async function getDatabase() {
  const client = await getMongoClient();
  return client.db();
}

async function closeMongoClient() {
  if (!globalForMongo.__mongoClient) {
    return;
  }

  await globalForMongo.__mongoClient.close();
  globalForMongo.__mongoClient = null;
  globalForMongo.__mongoClientPromise = null;
}

module.exports = {
  getMongoClient,
  getDatabase,
  closeMongoClient,
};
