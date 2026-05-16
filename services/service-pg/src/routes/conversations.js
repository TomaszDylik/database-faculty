const express = require('express');
const prisma = require('../db/prisma');
const { sequelize } = require('../db/sequelize');
const {
  User,
  Conversation,
  ConversationMember,
} = require('../db/sequelizeModels');

const router = express.Router();

function sendError(res, status, error, code, details) {
  const payload = { error, code };

  if (details !== undefined) {
    payload.details = details;
  }

  return res.status(status).json(payload);
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

function serializeAddedMember(member) {
  return {
    userId: member.userId,
    role: member.role,
    joinedAt: member.joinedAt,
    user: member.user
      ? {
          email: member.user.email,
          displayName: member.user.displayName,
        }
      : undefined,
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
  const uniqueUserIds = [...new Set(userIds)].filter((userId) => userId !== addedByUserId);

  if (!addedByUserId || uniqueUserIds.length === 0) {
    return sendError(
      res,
      400,
      'Wymagane addedByUserId oraz lista userIds.',
      'VALIDATION_ERROR'
    );
  }

  try {
    const result = await sequelize.transaction(async (transaction) => {
      const conversation = await Conversation.findByPk(conversationId, {
        include: [
          {
            model: ConversationMember,
            as: 'members',
            include: [
              {
                model: User,
                as: 'user',
                attributes: ['id', 'email', 'displayName'],
              },
            ],
          },
        ],
        transaction,
      });

      if (!conversation) {
        throw { status: 404, error: 'Konwersacja nie istnieje.', code: 'NOT_FOUND' };
      }

      if (conversation.type === 'DIRECT') {
        throw {
          status: 409,
          error: 'Nie można dodawać nowych osób do prywatnej konwersacji (DIRECT).',
          code: 'DIRECT_LOCKED',
        };
      }

      const actorMembership = conversation.members.find((member) => member.userId === addedByUserId);

      if (!actorMembership) {
        throw {
          status: 403,
          error: 'Tylko obecni członkowie mogą dodawać nowe osoby.',
          code: 'FORBIDDEN',
        };
      }

      const existingUsers = await User.findAll({
        where: { id: uniqueUserIds },
        attributes: ['id', 'email', 'displayName'],
        transaction,
      });

      const existingUserIds = new Set(existingUsers.map((user) => user.id));
      const missingUserIds = uniqueUserIds.filter(
        (userId) => !existingUserIds.has(userId)
      );

      if (missingUserIds.length > 0) {
        throw {
          status: 400,
          error: 'Nie wszyscy wskazani użytkownicy istnieją w bazie.',
          code: 'USER_NOT_FOUND',
          details: { missingUserIds },
        };
      }

      const currentMemberIds = new Set(conversation.members.map((member) => member.userId));

      const usersToAdd = uniqueUserIds.filter((userId) => !currentMemberIds.has(userId));
      const skippedUserIds = uniqueUserIds.filter((userId) => currentMemberIds.has(userId));

      if (usersToAdd.length === 0) {
        return {
          message: 'Wszyscy wskazani użytkownicy już należą do tej konwersacji.',
          addedMembers: [],
          skippedUserIds,
        };
      }

      await ConversationMember.bulkCreate(
        usersToAdd.map((userId) => ({
          conversationId,
          userId,
          role: 'MEMBER',
        })),
        { transaction }
      );

      const createdMembers = await ConversationMember.findAll({
        where: {
          conversationId,
          userId: usersToAdd,
        },
        include: [
          {
            model: User,
            as: 'user',
            attributes: ['id', 'email', 'displayName'],
          },
        ],
        order: [['joinedAt', 'ASC']],
        transaction,
      });

      return {
        message: 'Użytkownicy zostali pomyślnie dodani.',
        addedMembers: createdMembers.map(serializeAddedMember),
        skippedUserIds,
      };
    });

    return res.status(result.addedMembers.length > 0 ? 201 : 200).json(result);
  } catch (error) {
    if (error.status && error.error) {
      return sendError(res, error.status, error.error, error.code, error.details);
    }

    return sendError(res, 500, 'Nie udało się dodać użytkowników.', 'ADD_FAILED');
  }
});

module.exports = router;