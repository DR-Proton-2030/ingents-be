"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = require("mongoose");
const generatedEmails_schema_1 = require("./generatedEmails.schema");
const GeneratedEmailsModel = (0, mongoose_1.model)("generated_emails", generatedEmails_schema_1.generatedEmailsSchema);
exports.default = GeneratedEmailsModel;
