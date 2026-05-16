const { DataTypes, Model } = require('sequelize');

const { sequelize } = require('./sequelize');

class User extends Model {}

User.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    email: {
      type: DataTypes.STRING(255),
      allowNull: false,
      unique: true,
    },
    displayName: {
      type: DataTypes.STRING(120),
      allowNull: false,
    },
  },
  {
    sequelize,
    modelName: 'User',
    tableName: 'users',
    timestamps: true,
    underscored: true,
  }
);

class Conversation extends Model {}

Conversation.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    title: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    type: {
      type: DataTypes.ENUM('DIRECT', 'GROUP'),
      allowNull: false,
    },
    createdById: {
      type: DataTypes.UUID,
      allowNull: true,
    },
  },
  {
    sequelize,
    modelName: 'Conversation',
    tableName: 'conversations',
    timestamps: true,
    underscored: true,
  }
);

class ConversationMember extends Model {}

ConversationMember.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    conversationId: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    role: {
      type: DataTypes.ENUM('OWNER', 'ADMIN', 'MEMBER'),
      allowNull: false,
      defaultValue: 'MEMBER',
    },
    joinedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    sequelize,
    modelName: 'ConversationMember',
    tableName: 'conversation_members',
    timestamps: true,
    underscored: true,
  }
);

Conversation.belongsTo(User, {
  as: 'createdBy',
  foreignKey: 'createdById',
});

User.hasMany(Conversation, {
  as: 'createdConversations',
  foreignKey: 'createdById',
});

Conversation.hasMany(ConversationMember, {
  as: 'members',
  foreignKey: 'conversationId',
});

ConversationMember.belongsTo(Conversation, {
  as: 'conversation',
  foreignKey: 'conversationId',
});

User.hasMany(ConversationMember, {
  as: 'memberships',
  foreignKey: 'userId',
});

ConversationMember.belongsTo(User, {
  as: 'user',
  foreignKey: 'userId',
});

module.exports = {
  User,
  Conversation,
  ConversationMember,
};