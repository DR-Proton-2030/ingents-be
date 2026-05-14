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
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateContent = void 0;
const ai_service_1 = require("../../../../services/ai/ai.service");
const generateContent = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { userId, companyId, context, feature } = req.body;
        if (!userId || !companyId || !context) {
            return res.status(400).json({
                success: false,
                message: "userId, companyId, and context are required",
            });
        }
        const content = yield (0, ai_service_1.generateAIContent)(userId, companyId, context, feature);
        return res.status(200).json({
            success: true,
            result: content,
        });
    }
    catch (error) {
        console.error("Error in AI generation controller:", error);
        return res.status(500).json({
            success: false,
            message: error.message || "Internal server error",
        });
    }
});
exports.generateContent = generateContent;
