const connectionString = process.env.DATABASE_URL || 'postgresql://chat_user:chat_password@postgres:5432/chat_app?schema=public';

const baseConfig = {
  client: 'pg',
  connection: connectionString,
  pool: {
    min: 1,
    max: 10,
  },
  migrations: {
    directory: './db/migrations',
    tableName: 'knex_migrations',
  },
  seeds: {
    directory: './db/seeds',
  },
};

module.exports = {
  development: baseConfig,
  production: baseConfig,
};
