"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = require("mongoose");
const chatSession_schema_1 = require("./chatSession.schema");
const ChatSessionModel = (0, mongoose_1.model)("chat_session", chatSession_schema_1.chatSessionSchema);
exports.default = ChatSessionModel;
