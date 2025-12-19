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
exports.deletePurchasedEmailTemplate = exports.updatePurchasedEmailTemplate = exports.getPurchasedEmailTemplateById = exports.getAllPurchasedEmailTemplates = exports.createPurchasedEmailTemplate = void 0;
const purchasedEmailTemplate_model_1 = __importDefault(require("../../../../models/purchasedEmailTemplate/purchasedEmailTemplate.model"));
const createPurchasedEmailTemplate = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const payload = req.body;
        const instance = yield new purchasedEmailTemplate_model_1.default(payload).save();
        return res
            .status(201)
            .json({ message: "PurchasedEmailTemplate created", data: instance });
    }
    catch (error) {
        console.error("createPurchasedEmailTemplate error:", error);
        return res.status(500).json({ message: "Something went wrong", error });
    }
});
exports.createPurchasedEmailTemplate = createPurchasedEmailTemplate;
const getAllPurchasedEmailTemplates = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const filter = {};
        // If user is available, restrict to buyer_id
        if (req.user && req.user._id)
            filter.buyer_id = String(req.user._id);
        const items = yield purchasedEmailTemplate_model_1.default.find(filter);
        return res
            .status(200)
            .json({ message: "Fetched successfully", data: items });
    }
    catch (error) {
        console.error("getAllPurchasedEmailTemplates error:", error);
        return res.status(500).json({ message: "Something went wrong", error });
    }
});
exports.getAllPurchasedEmailTemplates = getAllPurchasedEmailTemplates;
const getPurchasedEmailTemplateById = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const item = yield purchasedEmailTemplate_model_1.default.findById(id);
        if (!item)
            return res.status(404).json({ message: "Not found" });
        return res
            .status(200)
            .json({ message: "Fetched successfully", data: item });
    }
    catch (error) {
        console.error("getPurchasedEmailTemplateById error:", error);
        return res.status(500).json({ message: "Something went wrong", error });
    }
});
exports.getPurchasedEmailTemplateById = getPurchasedEmailTemplateById;
const updatePurchasedEmailTemplate = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const updated = yield purchasedEmailTemplate_model_1.default.findByIdAndUpdate(id, req.body, { new: true });
        if (!updated)
            return res.status(404).json({ message: "Not found" });
        return res
            .status(200)
            .json({ message: "Updated successfully", data: updated });
    }
    catch (error) {
        console.error("updatePurchasedEmailTemplate error:", error);
        return res.status(500).json({ message: "Something went wrong", error });
    }
});
exports.updatePurchasedEmailTemplate = updatePurchasedEmailTemplate;
const deletePurchasedEmailTemplate = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const deleted = yield purchasedEmailTemplate_model_1.default.findByIdAndDelete(id);
        if (!deleted)
            return res.status(404).json({ message: "Not found" });
        return res.status(200).json({ message: "Deleted successfully" });
    }
    catch (error) {
        console.error("deletePurchasedEmailTemplate error:", error);
        return res.status(500).json({ message: "Something went wrong", error });
    }
});
exports.deletePurchasedEmailTemplate = deletePurchasedEmailTemplate;
