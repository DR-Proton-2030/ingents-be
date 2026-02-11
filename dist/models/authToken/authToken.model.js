"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = require("mongoose");
const authToken_schema_1 = require("./authToken.schema");
const AuthTokenModel = (0, mongoose_1.model)("auth_tokens", authToken_schema_1.authTokenSchema);
exports.default = AuthTokenModel;
