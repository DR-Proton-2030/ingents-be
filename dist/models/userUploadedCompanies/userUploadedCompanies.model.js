"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = require("mongoose");
const userUploadedCompanies_schema_1 = require("./userUploadedCompanies.schema");
const UploadedCompanyModel = (0, mongoose_1.model)("user_uploaded-companies", userUploadedCompanies_schema_1.userUploadedCompanySchema);
exports.default = UploadedCompanyModel;
