"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = require("mongoose");
const userChatHistory_schema_1 = require("./userChatHistory.schema");
const UserChatHistoryModel = (0, mongoose_1.model)("user_chat_history", userChatHistory_schema_1.userChatHistorySchema);
exports.default = UserChatHistoryModel;
