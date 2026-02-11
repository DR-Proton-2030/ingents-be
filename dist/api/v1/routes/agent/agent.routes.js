"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const agent_controller_1 = require("../../controller/agent/agent.controller");
const userAuth_1 = require("../../middlewares/auth/userAuth");
const agentRouter = (0, express_1.Router)();
agentRouter.post("/run", userAuth_1.userAuth, agent_controller_1.runAgent);
exports.default = agentRouter;
