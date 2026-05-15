const mongoose = require('mongoose');

const attachmentSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 255,
    },
    mimeType: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      maxlength: 120,
    },
    size: {
      type: Number,
      required: true,
      min: 0,
    },
    storageKey: {
      type: String,
      required: true,
      trim: true,
      maxlength: 255,
    },
    metadata: {
      type: Map,
      of: String,
      default: undefined,
    },
  },
  {
    _id: false,
  }
);

const messageSchema = new mongoose.Schema(
  {
    conversationId: {
      type: String,
      required: true,
      trim: true,
      maxlength: 64,
    },
    authorId: {
      type: String,
      required: true,
      trim: true,
      maxlength: 64,
    },
    body: {
      type: String,
      required: true,
      trim: true,
      maxlength: 4000,
    },
    deliveryStatus: {
      type: String,
      enum: ['RECEIVED', 'STORED', 'FAILED'],
      default: 'RECEIVED',
    },
    attachments: {
      type: [attachmentSchema],
      default: [],
    },
    createdAt: {
      type: Date,
      default: Date.now,
      immutable: true,
    },
    editedAt: {
      type: Date,
      default: null,
    },
  },
  {
    collection: 'messages',
    versionKey: false,
  }
);

messageSchema.index(
  { conversationId: 1, createdAt: -1 },
  { name: 'messages_conversation_created_at_idx' }
);

messageSchema.index(
  { authorId: 1, createdAt: -1 },
  { name: 'messages_author_created_at_idx' }
);

messageSchema.index(
  { body: 'text', 'attachments.name': 'text' },
  {
    name: 'messages_text_search_idx',
    weights: {
      body: 10,
      'attachments.name': 4,
    },
  }
);

module.exports = mongoose.models.Message || mongoose.model('Message', messageSchema);
