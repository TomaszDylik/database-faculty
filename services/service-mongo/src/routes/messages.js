const express = require('express');
const { getDatabase } = require('../db/mongoClient');
const { withPgClient } = require('../db/pgPool');
const Message = require('../models/Message');

const router = express.Router();

function sendError(res, status, error, code, details) {
  return res.status(status).json({ error, code, details });
}

function serializeMessage(msg) {
  return {
    id: msg._id.toString(),
    conversationId: msg.conversationId,
    authorId: msg.authorId,
    body: msg.body,
    attachments: msg.attachments,
    createdAt: msg.createdAt,
  };
}

function normalizeString(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function parseCsvList(value) {
  if (typeof value !== 'string') {
    return [];
  }

  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function parseDateParam(value) {
  const normalized = normalizeString(value);

  if (!normalized) {
    return null;
  }

  const parsed = new Date(normalized);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function isValidTimeZone(value) {
  try {
    Intl.DateTimeFormat('en-US', { timeZone: value });
    return true;
  } catch (_error) {
    return false;
  }
}

function buildDailyAnalyticsPipeline({ conversationId, timeZone }) {
  return [
    { $match: { conversationId } },
    {
      $group: {
        _id: {
          $dateToString: {
            format: '%Y-%m-%d',
            date: '$createdAt',
            timezone: timeZone,
          },
        },
        messageCount: { $sum: 1 },
        lastMessageAt: { $max: '$createdAt' },
      },
    },
    {
      $project: {
        _id: 0,
        day: '$_id',
        messageCount: 1,
        lastMessageAt: 1,
      },
    },
    {
      $lookup: {
        from: Message.collection.collectionName,
        let: {
          lastMessageAt: '$lastMessageAt',
        },
        pipeline: [
          {
            $match: {
              conversationId,
              $expr: { $eq: ['$createdAt', '$$lastMessageAt'] },
            },
          },
          {
            $project: {
              _id: 0,
              authorId: 1,
              body: 1,
              createdAt: 1,
            },
          },
          { $limit: 1 },
        ],
        as: 'latestMessage',
      },
    },
    {
      $project: {
        day: 1,
        messageCount: 1,
        latestMessage: { $arrayElemAt: ['$latestMessage', 0] },
      },
    },
    { $sort: { day: 1 } },
  ];
}

function serializeNativeSearchMessage(doc) {
  return {
    id: doc._id.toString(),
    conversationId: doc.conversationId,
    authorId: doc.authorId,
    body: doc.body,
    attachments: doc.attachments || [],
    createdAt: doc.createdAt,
  };
}

async function createHybridMessage({ conversationId, authorId, body, attachments }) {
  return withPgClient(async (client) => {
    let storedMessage = null;

    try {
      await client.query('BEGIN');

      const convResult = await client.query(
        `SELECT id, next_message_seq FROM conversations WHERE id = $1 FOR UPDATE`,
        [conversationId]
      );
      if (convResult.rows.length === 0) throw { status: 404, error: 'Konwersacja nie istnieje.', code: 'NOT_FOUND' };
      
      const conversation = convResult.rows[0];

      const memberResult = await client.query(
        `SELECT role FROM conversation_members WHERE conversation_id = $1 AND user_id = $2`,
        [conversationId, authorId]
      );
      if (memberResult.rows.length === 0) throw { status: 403, error: 'Brak uprawnień.', code: 'FORBIDDEN' };

      const createdAt = new Date();

      storedMessage = await Message.create({
        conversationId, authorId, body, attachments, createdAt, deliveryStatus: 'STORED'
      });

      const seq = conversation.next_message_seq;
      
      await client.query(
        `INSERT INTO message_pointers (conversation_id, seq, mongo_id, created_at) VALUES ($1, $2, $3, $4)`,
        [conversationId, seq, storedMessage._id.toString(), createdAt]
      );

      await client.query(
        `UPDATE conversations SET last_message_at = $2, next_message_seq = $3, updated_at = NOW() WHERE id = $1`,
        [conversationId, createdAt, seq + 1]
      );

      await client.query('COMMIT');

      return { message: storedMessage, sequence: seq };

    } catch (error) {
      await client.query('ROLLBACK').catch(() => null);

      if (storedMessage) {
        await Message.deleteOne({ _id: storedMessage._id }).catch(() => null);
      }
      
      throw error;
    }
  });
}

router.get('/analytics/messages/daily', async (req, res) => {
  const conversationId = normalizeString(req.query.conversationId);
  const timeZone = normalizeString(req.query.timezone) || 'UTC';

  if (!conversationId) {
    return sendError(
      res,
      400,
      'Parametr conversationId jest wymagany dla endpointu analitycznego.',
      'VALIDATION_ERROR'
    );
  }

  if (!isValidTimeZone(timeZone)) {
    return sendError(res, 400, 'Parametr timezone nie jest poprawna strefa czasowa.', 'VALIDATION_ERROR');
  }

  try {
    const days = await Message.aggregate(buildDailyAnalyticsPipeline({ conversationId, timeZone }));

    return res.json({
      conversationId,
      timezone: timeZone,
      days,
    });
  } catch (error) {
    return sendError(
      res,
      500,
      'Nie udalo sie policzyc analityki wiadomosci.',
      'MESSAGES_ANALYTICS_FAILED'
    );
  }
});

router.get('/messages/native-search', async (req, res) => {
  const conversationIds = parseCsvList(req.query.conversationIds);
  const searchText = normalizeString(req.query.q);
  const fromDate = parseDateParam(req.query.from);
  const toDate = parseDateParam(req.query.to);
  const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 20, 1), 50);
  const filter = {};
  const operatorsUsed = [];

  if (!conversationIds.length && !searchText && !req.query.from && !req.query.to) {
    return sendError(
      res,
      400,
      'Podaj co najmniej jeden filtr: conversationIds, q, from lub to.',
      'VALIDATION_ERROR'
    );
  }

  if (req.query.from && !fromDate) {
    return sendError(res, 400, 'Parametr from musi byc poprawna data ISO.', 'VALIDATION_ERROR');
  }

  if (req.query.to && !toDate) {
    return sendError(res, 400, 'Parametr to musi byc poprawna data ISO.', 'VALIDATION_ERROR');
  }

  if (fromDate && toDate && fromDate > toDate) {
    return sendError(res, 400, 'Parametr from nie moze byc pozniejszy niz to.', 'VALIDATION_ERROR');
  }

  if (conversationIds.length > 0) {
    filter.conversationId = { $in: conversationIds };
    operatorsUsed.push('$in');
  }

  if (searchText) {
    filter.$text = { $search: searchText };
    operatorsUsed.push('$text');
  }

  if (fromDate || toDate) {
    filter.createdAt = {};

    if (fromDate) {
      filter.createdAt.$gte = fromDate;
      operatorsUsed.push('$gte');
    }

    if (toDate) {
      filter.createdAt.$lte = toDate;
      operatorsUsed.push('$lte');
    }
  }

  try {
    const database = await getDatabase();
    const collection = database.collection('messages');
    const projection = {
      conversationId: 1,
      authorId: 1,
      body: 1,
      attachments: 1,
      createdAt: 1,
    };

    if (searchText) {
      projection.score = { $meta: 'textScore' };
    }

    let cursor = collection.find(filter, { projection });

    if (searchText) {
      cursor = cursor.sort({ score: { $meta: 'textScore' }, createdAt: -1 });
    } else {
      cursor = cursor.sort({ createdAt: -1 });
    }

    const items = await cursor.limit(limit).toArray();

    return res.json({
      engine: 'mongodb-native-driver',
      operatorsUsed,
      limit,
      items: items.map(serializeNativeSearchMessage),
    });
  } catch (error) {
    return sendError(
      res,
      500,
      'Nie udalo sie wykonac natywnego wyszukiwania MongoDB.',
      'NATIVE_SEARCH_FAILED'
    );
  }
});


router.post('/messages', async (req, res) => {
  const { conversationId, authorId, body, attachments = [] } = req.body;

  if (!conversationId || !authorId || !body) {
    return sendError(res, 400, 'Wymagane pola: conversationId, authorId, body.', 'VALIDATION_ERROR');
  }

  try {
    const result = await createHybridMessage({ conversationId, authorId, body, attachments });
    
    return res.status(201).json({
      message: serializeMessage(result.message.toObject()),
      postgres: { synced: true, sequence: result.sequence },
    });
  } catch (error) {
    if (error.status) return sendError(res, error.status, error.error, error.code);
    return sendError(res, 500, 'Nie udało się zapisać wiadomości hybrydowej.', 'HYBRID_ERROR');
  }
});

router.get('/messages', async (req, res) => {
  const { conversationId } = req.query;
  const limit = Math.min(Math.max(parseInt(req.query.limit) || 20, 1), 100);
  const offset = Math.max(parseInt(req.query.offset) || 0, 0);
  const sortDirection = req.query.sort === 'desc' ? -1 : 1;

  if (!conversationId) {
    return sendError(res, 400, 'Parametr conversationId jest wymagany.', 'VALIDATION_ERROR');
  }

  try {
    const [items, total] = await Promise.all([
      Message.find({ conversationId }).sort({ createdAt: sortDirection }).skip(offset).limit(limit).lean(),
      Message.countDocuments({ conversationId }),
    ]);

    return res.json({
      conversationId,
      items: items.map(serializeMessage),
      pagination: { limit, offset, total, hasMore: offset + items.length < total },
    });
  } catch (error) {
    return sendError(res, 500, 'Błąd pobierania wiadomości.', 'FETCH_ERROR');
  }
});

module.exports = router;