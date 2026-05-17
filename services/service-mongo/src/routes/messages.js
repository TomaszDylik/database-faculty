const express = require('express');
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