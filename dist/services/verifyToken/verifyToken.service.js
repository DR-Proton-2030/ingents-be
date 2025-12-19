"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyToken = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const config_1 = require("../../config/config");
const verifyToken = (token) => {
    try {
        if (!config_1.jwtSecret) {
            throw new Error("JWT secret is not defined");
        }
        const decoded = jsonwebtoken_1.default.verify(token, config_1.jwtSecret);
        return decoded;
    }
    catch (error) {
        console.error("Token verification failed:", error);
        return null;
    }
};
exports.verifyToken = verifyToken;
