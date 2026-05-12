const toPort = (value, fallback) => {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
};

module.exports = {
  port: toPort(process.env.PORT || process.env.SERVICE_PG_PORT, 8081),
  databaseUrl: process.env.DATABASE_URL || 'postgresql://chat_user:chat_password@postgres:5432/chat_app?schema=public',
};
