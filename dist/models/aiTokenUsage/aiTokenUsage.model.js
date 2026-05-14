"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = require("mongoose");
const aiTokenUsage_schema_1 = require("./aiTokenUsage.schema");
const AITokenUsageModel = (0, mongoose_1.model)("ai_token_usages", aiTokenUsage_schema_1.aiTokenUsageSchema);
exports.default = AITokenUsageModel;
