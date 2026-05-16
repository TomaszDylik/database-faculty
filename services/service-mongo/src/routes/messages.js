const express = require('express');

const Message = require('../models/Message');

const router = express.Router();

function sendError(res, status, error, code, details) {
  return res.status(status).json({ error, code, details });
}

function normalizeId(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function parsePositiveInt(value, fallback, options = {}) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed)) {
    return fallback;
  }

  if (options.min != null && parsed < options.min) {
    return fallback;
  }

  if (options.max != null && parsed > options.max) {
    return fallback;
  }

  return parsed;
}

function serializeMessage(message) {
  return {
    id: message._id.toString(),
    conversationId: message.conversationId,
    authorId: message.authorId,
    body: message.body,
    deliveryStatus: message.deliveryStatus,
    attachments: message.attachments,
    createdAt: message.createdAt,
    editedAt: message.editedAt,
  };
}

router.post('/messages', async (req, res) => {
  const conversationId = normalizeId(req.body.conversationId);
  const authorId = normalizeId(req.body.authorId);
  const body = typeof req.body.body === 'string' ? req.body.body.trim() : '';
  const attachments = req.body.attachments == null ? [] : req.body.attachments;

  if (!conversationId || !authorId || !body) {
    return sendError(
      res,
      400,
      'Wymagane sa pola conversationId, authorId i body.',
      'VALIDATION_ERROR'
    );
  }

  if (!Array.isArray(attachments)) {
    return sendError(
      res, 
      400, 
      'Pole attachments musi byc tablica.', 
      'VALIDATION_ERROR'
    );
  }

  try {
    const message = await Message.create({
      conversationId,
      authorId,
      body,
      attachments,
    });

    return res.status(201).json({
      message: serializeMessage(message.toObject()),
    });
  } catch (error) {
    if (error.name === 'ValidationError') {
      return sendError(res, 400, 'Nieprawidlowe dane wiadomosci.', 'VALIDATION_ERROR', {
        fields: Object.values(error.errors).map((fieldError) => ({
          field: fieldError.path,
          message: fieldError.message,
        })),
      });
    }

    return sendError(res, 500, 'Nie udalo sie zapisac wiadomosci.', 'MESSAGE_CREATE_FAILED');
  }
});

router.get('/messages', async (req, res) => {
  const conversationId = normalizeId(req.query.conversationId);
  const limit = parsePositiveInt(req.query.limit, 20, { min: 1, max: 100 });
  const offset = parsePositiveInt(req.query.offset, 0, { min: 0 });
  const sort = normalizeId(req.query.sort || 'asc').toLowerCase() === 'desc' ? 'desc' : 'asc';

  if (!conversationId) {
    return sendError(res, 400, 'Parametr conversationId jest wymagany.', 'VALIDATION_ERROR');
  }

  const sortDirection = sort === 'desc' ? -1 : 1;

  try {
    const [items, total] = await Promise.all([
      Message.find({ conversationId })
        .sort({ createdAt: sortDirection, _id: sortDirection })
        .skip(offset)
        .limit(limit)
        .lean(),
      Message.countDocuments({ conversationId }),
    ]);

    return res.json({
      conversationId,
      sort,
      items: items.map(serializeMessage),
      pagination: {
        limit,
        offset,
        total,
        hasMore: offset + items.length < total,
      },
    });
  } catch (error) {
    return sendError(res, 500, 'Nie udalo sie pobrac wiadomosci.', 'MESSAGE_FETCH_FAILED');
  }
});

module.exports = router;
