const toPort = (value, fallback) => {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
};

module.exports = {
  port: toPort(process.env.PORT || process.env.SERVICE_MONGO_PORT, 8082),
  mongoUri: process.env.MONGO_URI || 'mongodb://chat_root:chat_password@mongo:27017/chat_messages?authSource=admin',
};
