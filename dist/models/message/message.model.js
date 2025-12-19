"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = require("mongoose");
const message_schema_1 = require("./message.schema");
const MessageModel = (0, mongoose_1.model)("messages", message_schema_1.messageSchema);
exports.default = MessageModel;
