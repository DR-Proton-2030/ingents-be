"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const virtualAssistant_controller_1 = require("../../controller/virtualAssistant/virtualAssistant.controller");
const userAuth_1 = require("../../middlewares/auth/userAuth");
const virtualAssistantRouter = (0, express_1.Router)();
virtualAssistantRouter.post("/chat", userAuth_1.userAuth, virtualAssistant_controller_1.chatWithAssistant);
exports.default = virtualAssistantRouter;
