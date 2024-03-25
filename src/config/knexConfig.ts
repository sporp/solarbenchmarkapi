import dotenv from 'dotenv';
dotenv.config({path: '.env'});

export const knex = require('knex')({
    client: 'pg',
    connection: process.env.PG_CONNECTION_STRING,
    pool: { min: 0, max: 5, idleTimeoutMillis: 120000 }
  },);