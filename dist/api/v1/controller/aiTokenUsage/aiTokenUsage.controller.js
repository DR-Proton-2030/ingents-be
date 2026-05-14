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
exports.getAITokenUsage = void 0;
const aiTokenUsage_model_1 = __importDefault(require("../../../../models/aiTokenUsage/aiTokenUsage.model"));
const getAITokenUsage = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { company_object_id } = req.user;
        const usages = yield aiTokenUsage_model_1.default.find({ company_object_id }).lean();
        // Aggregate by user
        const usageByUser = {};
        let totalTokens = 0;
        usages.forEach(usage => {
            totalTokens += usage.tokens_used;
            const userIdStr = usage.user_object_id.toString();
            if (!usageByUser[userIdStr]) {
                usageByUser[userIdStr] = 0;
            }
            usageByUser[userIdStr] += usage.tokens_used;
        });
        res.status(200).json({
            success: true,
            data: {
                totalTokens,
                usageByUser
            }
        });
    }
    catch (error) {
        console.error("Error fetching AI token usage:", error);
        res.status(500).json({ success: false, message: "Internal server error" });
    }
});
exports.getAITokenUsage = getAITokenUsage;
