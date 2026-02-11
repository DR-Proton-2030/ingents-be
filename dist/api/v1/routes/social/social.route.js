"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const social_controller_1 = require("../../controller/social/social.controller");
const router = express_1.default.Router();
// Unified social metrics
router.get("/metrics", social_controller_1.getSocialMetrics);
exports.default = router;
