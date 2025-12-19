"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.userUploadedCompanySchema = void 0;
const mongoose_1 = require("mongoose");
const model_constant_1 = __importDefault(require("../../constants/model/model.constant"));
const schemaOption_1 = require("../../constants/model/schemaOption");
// const UploadedCompanySchema: Schema<IUploadedCompany> =
//   new Schema<IUploadedCompany>(
//     {
//       company_name: SCHEMA_DEFINITION_PROPERTY.requiredString,
//       company_industry: SCHEMA_DEFINITION_PROPERTY.requiredString,
//       no_of_employees: SCHEMA_DEFINITION_PROPERTY.optionalNullString,
//       type: SCHEMA_DEFINITION_PROPERTY.optionalNullString,
//       role: SCHEMA_DEFINITION_PROPERTY.optionalNullString,
//       company_email: SCHEMA_DEFINITION_PROPERTY.optionalNullString,
//       company_website: SCHEMA_DEFINITION_PROPERTY.optionalNullString,
//       contact_number: SCHEMA_DEFINITION_PROPERTY.optionalNullString,
//     },
//     {
//       ...GENERAL_SCHEMA_OPTIONS,
//       toJSON: { virtuals: true },
//       toObject: { virtuals: true },
//     }
//   );
exports.userUploadedCompanySchema = new mongoose_1.Schema({
    userId: model_constant_1.default.requiredObjectId,
    company_name: model_constant_1.default.requiredString,
    company_industry: model_constant_1.default.requiredString,
    no_of_employees: model_constant_1.default.optionalNullString,
    type: model_constant_1.default.optionalNullString,
    role: model_constant_1.default.optionalNullString,
    company_email: model_constant_1.default.optionalNullString,
    company_website: model_constant_1.default.optionalNullString,
    contact_number: model_constant_1.default.optionalNullString,
    date: { type: Date, default: Date.now },
}, Object.assign(Object.assign({}, schemaOption_1.GENERAL_SCHEMA_OPTIONS), { toJSON: { virtuals: true }, toObject: { virtuals: true } }));
