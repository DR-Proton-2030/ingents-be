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
exports.deleteEmailTemplate = exports.updateEmailTemplate = exports.getEmailTemplateById = exports.getAllEmailTemplates = exports.createEmailTemplate = void 0;
const emailTemplate_model_1 = __importDefault(require("../../../../models/emailTemplate/emailTemplate.model"));
const createEmailTemplate = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const instance = yield new emailTemplate_model_1.default(req.body).save();
        return res
            .status(201)
            .json({ message: "EmailTemplate created", data: instance });
    }
    catch (error) {
        console.error("createEmailTemplate error:", error);
        return res.status(500).json({ message: "Something went wrong", error });
    }
});
exports.createEmailTemplate = createEmailTemplate;
const getAllEmailTemplates = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const items = yield emailTemplate_model_1.default.find({});
        return res
            .status(200)
            .json({ message: "Fetched successfully", data: items });
    }
    catch (error) {
        console.error("getAllEmailTemplates error:", error);
        return res.status(500).json({ message: "Something went wrong", error });
    }
});
exports.getAllEmailTemplates = getAllEmailTemplates;
const getEmailTemplateById = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const item = yield emailTemplate_model_1.default.findById(id);
        if (!item)
            return res.status(404).json({ message: "Not found" });
        return res
            .status(200)
            .json({ message: "Fetched successfully", data: item });
    }
    catch (error) {
        console.error("getEmailTemplateById error:", error);
        return res.status(500).json({ message: "Something went wrong", error });
    }
});
exports.getEmailTemplateById = getEmailTemplateById;
const updateEmailTemplate = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const updated = yield emailTemplate_model_1.default.findByIdAndUpdate(id, req.body, {
            new: true,
        });
        if (!updated)
            return res.status(404).json({ message: "Not found" });
        return res
            .status(200)
            .json({ message: "Updated successfully", data: updated });
    }
    catch (error) {
        console.error("updateEmailTemplate error:", error);
        return res.status(500).json({ message: "Something went wrong", error });
    }
});
exports.updateEmailTemplate = updateEmailTemplate;
const deleteEmailTemplate = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const deleted = yield emailTemplate_model_1.default.findByIdAndDelete(id);
        if (!deleted)
            return res.status(404).json({ message: "Not found" });
        return res.status(200).json({ message: "Deleted successfully" });
    }
    catch (error) {
        console.error("deleteEmailTemplate error:", error);
        return res.status(500).json({ message: "Something went wrong", error });
    }
});
exports.deleteEmailTemplate = deleteEmailTemplate;
