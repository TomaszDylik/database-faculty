const express = require('express');

const prisma = require('../db/prisma');

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
    const users = await prisma.user.findMany({
      orderBy: [
        { displayName: 'asc' },
        { email: 'asc' },
      ],
    });

    return res.json({
      total: users.length,
      users: users.map(serializeUser),
    });
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