const mongoose = require('mongoose');

const { mongoUri, mongoServerSelectionTimeoutMs } = require('../config/env');

const globalForMongoose = global;

mongoose.set('strictQuery', true);

async function connectMongoose() {
  if (!globalForMongoose.__mongooseConnectionPromise) {
    globalForMongoose.__mongooseConnectionPromise = mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: mongoServerSelectionTimeoutMs,
    });
  }

  await globalForMongoose.__mongooseConnectionPromise;
  return mongoose.connection;
}

async function disconnectMongoose() {
  if (mongoose.connection.readyState === 0) {
    globalForMongoose.__mongooseConnectionPromise = null;
    return;
  }

  await mongoose.disconnect();
  globalForMongoose.__mongooseConnectionPromise = null;
}

function getMongooseState() {
  const readyState = mongoose.connection.readyState;
  const stateLabelByCode = {
    0: 'disconnected',
    1: 'connected',
    2: 'connecting',
    3: 'disconnecting',
  };

  return {
    code: readyState,
    label: stateLabelByCode[readyState] || 'unknown',
  };
}

module.exports = {
  connectMongoose,
  disconnectMongoose,
  getMongooseState,
};
