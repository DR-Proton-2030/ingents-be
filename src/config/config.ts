import dotenv from "dotenv";

dotenv.config();

export const NODE_ENV = process.env.NODE_ENV;
export const MAIL_SERVER_URL = process.env.MAIL_SERVER_URL;

export const port = process.env.PORT;

export const MONGO_URI = process.env.MONGO_URI;
export const jwtSecret = process.env.JWT_SECRET;
