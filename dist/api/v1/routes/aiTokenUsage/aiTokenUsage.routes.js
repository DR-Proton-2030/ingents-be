"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const aiTokenUsage_controller_1 = require("../../controller/aiTokenUsage/aiTokenUsage.controller");
const userAuth_1 = require("../../middlewares/auth/userAuth");
const aiTokenUsageRouter = express_1.default.Router();
aiTokenUsageRouter.use(userAuth_1.userAuth);
aiTokenUsageRouter.get("/", aiTokenUsage_controller_1.getAITokenUsage);
exports.default = aiTokenUsageRouter;
