import dotenv from 'dotenv';
dotenv.config({path: '.env'});

export const port = process.env.PORT || 3456;
export const JWT_SECRET = process.env.JWT_SECRET || 'secrets_secrets_are_no_fun';
export const MONGO_STRING = process.env.MONGO_STRING || '';
export const baseURL = process.env.SOLAR_URL || '';
export const OPENAI_API_KEY = process.env.SOLAR_URL || '';