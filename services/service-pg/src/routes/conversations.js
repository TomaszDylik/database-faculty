const express = require('express');
const prisma = require('../db/prisma');

const router = express.Router();

function sendError(res, status, error, code) {
  return res.status(status).json({ error, code });
}

function serializeConversation(conv) {
  return {
    id: conv.id,
    type: conv.type,
    title: conv.title,
    createdById: conv.createdById,
    createdAt: conv.createdAt,
    members: Array.isArray(conv.members) ? conv.members.map(m => ({
      userId: m.userId,
      role: m.role,
      user: m.user ? { email: m.user.email, displayName: m.user.displayName } : undefined
    })) : []
  };
}

router.post('/conversations', async (req, res) => {
  const { createdById, type = 'DIRECT', title, memberIds = [] } = req.body;

  if (!createdById) {
    return sendError(res, 400, 'Wymagane pole createdById.', 'VALIDATION_ERROR');
  }

  const uniqueMemberIds = [...new Set(memberIds)].filter(id => id !== createdById);

  if (type !== 'DIRECT' && type !== 'GROUP') {
    return sendError(res, 400, 'Typ konwersacji musi być DIRECT lub GROUP.', 'VALIDATION_ERROR');
  }
  if (type === 'DIRECT' && uniqueMemberIds.length !== 1) {
    return sendError(res, 400, 'Konwersacja DIRECT musi mieć dokładnie jednego rozmówcę.', 'VALIDATION_ERROR');
  }
  if (type === 'GROUP' && uniqueMemberIds.length < 1) {
    return sendError(res, 400, 'Konwersacja GROUP musi mieć co najmniej jednego uczestnika.', 'VALIDATION_ERROR');
  }

  try {
    const conversation = await prisma.conversation.create({
      data: {
        type,
        title: type === 'GROUP' ? title : null,
        createdById,
        members: {
          create: [
            { userId: createdById, role: 'OWNER' },
            ...uniqueMemberIds.map(id => ({ userId: id, role: 'MEMBER' }))
          ]
        }
      },
      include: {
        members: { include: { user: true } }
      }
    });

    return res.status(201).json({ conversation: serializeConversation(conversation) });

  } catch (error) {
    return sendError(res, 400, 'Nie udało się stworzyć grupy. Sprawdź, czy użytkownicy istnieją.', 'CREATE_FAILED');
  }
});

router.post('/conversations/:conversationId/members', async (req, res) => {
  const { conversationId } = req.params;
  const { addedByUserId, userIds = [] } = req.body;

  if (!addedByUserId || userIds.length === 0) {
    return sendError(res, 400, 'Wymagane addedByUserId oraz lista userIds.', 'VALIDATION_ERROR');
  }

  try {
    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
      include: { members: true }
    });

    if (!conversation) {
      return sendError(res, 404, 'Konwersacja nie istnieje.', 'NOT_FOUND');
    }

    if (conversation.type === 'DIRECT') {
      return sendError(res, 409, 'Nie można dodawać nowych osób do prywatnej konwersacji (DIRECT).', 'DIRECT_LOCKED');
    }

    const isMember = conversation.members.some(m => m.userId === addedByUserId);
    if (!isMember) {
      return sendError(res, 403, 'Tylko obecni członkowie mogą dodawać nowe osoby.', 'FORBIDDEN');
    }

    const uniqueUserIds = [...new Set(userIds)];
    
    await prisma.conversationMember.createMany({
      data: uniqueUserIds.map(id => ({
        conversationId,
        userId: id,
        role: 'MEMBER'
      })),
      skipDuplicates: true
    });

    return res.status(201).json({ message: 'Użytkownicy zostali pomyślnie dodani.' });

  } catch (error) {
    return sendError(res, 500, 'Nie udało się dodać użytkowników.', 'ADD_FAILED');
  }
});

module.exports = router;