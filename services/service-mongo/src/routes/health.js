const express = require('express');

const { getDatabase } = require('../db/mongoClient');
const { getMongooseState } = require('../db/mongoose');
const { query } = require('../db/pgPool');
const Message = require('../models/Message');

const router = express.Router();

router.get('/health', async (_req, res) => {
  try {
    const database = await getDatabase();
    const pingResult = await database.command({ ping: 1 });
    const pgResult = await query('SELECT 1 AS pg_ok');
    const mongooseState = getMongooseState();
    const indexes = await Message.collection.indexes();

    res.json({
      status: 'ok',
      service: 'service-mongo',
      drivers: ['mongodb-native-driver', 'mongoose', 'pg'],
      nativeDriver: {
        database: database.databaseName,
        pingOk: pingResult.ok === 1,
      },
      postgres: {
        pingOk: pgResult.rows[0]?.pg_ok === 1,
      },
      mongoose: {
        state: mongooseState.label,
        collection: Message.collection.collectionName,
      },
      indexes: indexes.map((index) => index.name),
    });
  } catch (error) {
    res.status(503).json({
      status: 'error',
      service: 'service-mongo',
      message: error.message,
    });
  }
});

module.exports = router;
