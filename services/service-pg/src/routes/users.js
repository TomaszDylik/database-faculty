const express = require('express');
const { createClient } = require('redis');

const prisma = require('../db/prisma');

const REDIS_URL = process.env.REDIS_URL || 'redis://redis:6379';
const USERS_CACHE_KEY = 'users_cache';
const USERS_CACHE_TTL_SECONDS = 60;

let redisClient = null;

async function getRedisClient() {
  try {
    if (!redisClient) {
      redisClient = createClient({ url: REDIS_URL });
      redisClient.on('error', () => {});
      await redisClient.connect();
    } else if (!redisClient.isOpen) {
      await redisClient.connect();
    }

    return redisClient;
  } catch {
    redisClient = null;
    return null;
  }
}

async function fetchUsersFromDatabase() {
  const users = await prisma.user.findMany({
    orderBy: [
      { displayName: 'asc' },
      { email: 'asc' },
    ],
  });

  return {
    total: users.length,
    users: users.map(serializeUser),
  };
}

const router = express.Router();

function sendError(res, status, error, code, details) {
  const payload = { error, code };

  if (details !== undefined) {
    payload.details = details;
  }

  return res.status(status).json(payload);
}

function normalizeId(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function serializeUser(user) {
  return {
    id: user.id,
    email: user.email,
    displayName: user.displayName,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

function serializeConversationMember(member) {
  return {
    userId: member.userId,
    role: member.role,
    joinedAt: member.joinedAt,
    user: member.user
      ? {
          id: member.user.id,
          email: member.user.email,
          displayName: member.user.displayName,
        }
      : undefined,
  };
}

function serializeConversation(conversation) {
  return {
    id: conversation.id,
    type: conversation.type,
    title: conversation.title,
    createdById: conversation.createdById,
    createdAt: conversation.createdAt,
    updatedAt: conversation.updatedAt,
    lastMessageAt: conversation.lastMessageAt,
    memberCount: Array.isArray(conversation.members) ? conversation.members.length : 0,
    members: Array.isArray(conversation.members)
      ? conversation.members.map(serializeConversationMember)
      : [],
  };
}

router.get('/users', async (_req, res) => {
  try {
    const redis = await getRedisClient();

    if (redis) {
      try {
        const cached = await redis.get(USERS_CACHE_KEY);
        if (cached) {
          return res.json(JSON.parse(cached));
        }
      } catch {
      }
    }

    const payload = await fetchUsersFromDatabase();

    if (redis) {
      try {
        await redis.setEx(USERS_CACHE_KEY, USERS_CACHE_TTL_SECONDS, JSON.stringify(payload));
      } catch {
      }
    }

    return res.json(payload);
  } catch (error) {
    return sendError(res, 500, 'Nie udalo sie pobrac listy uzytkownikow.', 'USERS_FETCH_FAILED');
  }
});

router.get('/users/:userId/conversations', async (req, res) => {
  const userId = normalizeId(req.params.userId);

  if (!userId) {
    return sendError(res, 400, 'Parametr userId jest wymagany.', 'VALIDATION_ERROR');
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        displayName: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      return sendError(res, 404, 'Uzytkownik nie istnieje.', 'USER_NOT_FOUND');
    }

    const conversations = await prisma.conversation.findMany({
      where: {
        members: {
          some: { userId },
        },
      },
      orderBy: [
        { lastMessageAt: 'desc' },
        { createdAt: 'desc' },
      ],
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                email: true,
                displayName: true,
              },
            },
          },
          orderBy: [
            { joinedAt: 'asc' },
            { userId: 'asc' },
          ],
        },
      },
    });

    return res.json({
      user: serializeUser(user),
      total: conversations.length,
      sort: {
        primary: 'lastMessageAt desc',
        fallback: 'createdAt desc',
      },
      conversations: conversations.map(serializeConversation),
    });
  } catch (error) {
    return sendError(
      res,
      500,
      'Nie udalo sie pobrac konwersacji uzytkownika.',
      'USER_CONVERSATIONS_FETCH_FAILED'
    );
  }
});

module.exports = router;