"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = require("mongoose");
const agentRun_schema_1 = require("./agentRun.schema");
const AgentRunModel = (0, mongoose_1.model)("agentRuns", agentRun_schema_1.agentRunSchema);
exports.default = AgentRunModel;
