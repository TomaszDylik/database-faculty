const toPort = (value, fallback) => {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
};

module.exports = {
  port: toPort(process.env.PORT || process.env.API_GATEWAY_PORT, 8080),
  servicePgUrl: process.env.SERVICE_PG_URL || 'http://service-pg:8081',
  serviceMongoUrl: process.env.SERVICE_MONGO_URL || 'http://service-mongo:8082',
};
