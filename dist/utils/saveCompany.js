"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.saveCompany = void 0;
const mongoose_1 = require("mongoose");
const userUploadedCompanies_model_1 = __importDefault(require("../models/userUploadedCompanies/userUploadedCompanies.model"));
const saveCompany = (userId, companyData, session) => __awaiter(void 0, void 0, void 0, function* () {
    // const userDoc = await UploadedCompanyModel.findOne({ userId }).session(session);
    // if (userDoc) {
    //   const exists = userDoc.companies.find(
    //     (c) => c.company_name === companyData.company_name
    //   );
    //   if (exists) return null; // already exists, skip
    //   userDoc.companies.push(companyData);
    //   const updatedDoc = await userDoc.save({ session });
    //   return new Types.ObjectId(
    //     updatedDoc.companies[updatedDoc.companies.length - 1]._id
    //   );
    // } else {
    //   const newUserDoc = await new UploadedCompanyModel({
    //     userId,
    //     companies: [companyData],
    //   }).save({ session });
    //   return new Types.ObjectId(newUserDoc.companies[0]._id);
    // }
    console.log(companyData);
    const newUserDoc = yield new userUploadedCompanies_model_1.default(Object.assign({ userId }, companyData)).save({ session });
    return new mongoose_1.Types.ObjectId(newUserDoc._id);
});
exports.saveCompany = saveCompany;
