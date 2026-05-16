const { Sequelize } = require('sequelize');

const { databaseUrl } = require('../config/env');

const globalForSequelize = global;

const sequelize =
  globalForSequelize.__sequelize ||
  new Sequelize(databaseUrl, {
    dialect: 'postgres',
    logging: false,
  });

if (process.env.NODE_ENV !== 'production') {
  globalForSequelize.__sequelize = sequelize;
}

async function closeSequelize() {
  await sequelize.close();
  if (process.env.NODE_ENV !== 'production') {
    globalForSequelize.__sequelize = null;
  }
}

module.exports = {
  sequelize,
  closeSequelize,
};