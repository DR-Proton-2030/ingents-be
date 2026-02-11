"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const config_1 = require("../../config/config");
const generateToken = (payload, expiresIn = "7d") => {
    if (!config_1.jwtSecret) {
        throw new Error("JWT secret is not defined");
    }
    return jsonwebtoken_1.default.sign(payload, config_1.jwtSecret, { expiresIn });
};
exports.default = generateToken;
