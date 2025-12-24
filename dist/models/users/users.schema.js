"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = require("mongoose");
const model_constant_1 = __importDefault(require("../../constants/model/model.constant"));
const schemaOption_1 = require("../../constants/model/schemaOption");
const role_1 = require("../../constants/role");
const userSchema = new mongoose_1.Schema({
    full_name: model_constant_1.default.requiredString,
    email: Object.assign(Object.assign({}, model_constant_1.default.requiredString), { unique: true }),
    company_object_id: model_constant_1.default.requiredObjectId,
    has_joined: model_constant_1.default.requiredBoolean,
    role: Object.assign(Object.assign({}, model_constant_1.default.requiredString), { enum: role_1.USER_ROLES }),
    password: model_constant_1.default.optionalNullString,
    emp_id: model_constant_1.default.optionalNullString,
    profile_picture: model_constant_1.default.optionalNullString,
    facebook: {
        project_id: model_constant_1.default.optionalNullString,
        name: model_constant_1.default.optionalNullString,
        access_token: model_constant_1.default.optionalNullString,
    },
    instagram: {
        project_id: model_constant_1.default.optionalNullString,
        name: model_constant_1.default.optionalNullString,
        access_token: model_constant_1.default.optionalNullString,
    },
    youtube: {
        project_id: model_constant_1.default.optionalNullString,
        name: model_constant_1.default.optionalNullString,
        access_token: model_constant_1.default.optionalNullString,
    },
}, Object.assign(Object.assign({}, schemaOption_1.GENERAL_SCHEMA_OPTIONS), { toJSON: { virtuals: true }, toObject: { virtuals: true } }));
const CompanyVirtualReference = {
    ref: "companies",
    localField: "company_object_id",
    foreignField: "_id",
    justOne: true,
};
userSchema.virtual("company_details", CompanyVirtualReference);
exports.default = userSchema;
