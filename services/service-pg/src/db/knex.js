const createKnex = require('knex');

const knexConfig = require('../../knexfile');

const environment = process.env.NODE_ENV === 'production' ? 'production' : 'development';
const globalForKnex = global;

const knexDb = globalForKnex.__knexDb || createKnex(knexConfig[environment]);

if (process.env.NODE_ENV !== 'production') {
  globalForKnex.__knexDb = knexDb;
}

module.exports = knexDb;
