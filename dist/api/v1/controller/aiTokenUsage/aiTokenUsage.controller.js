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
const users_model_1 = __importDefault(require("../../../../models/users/users.model"));
const subscription_model_1 = __importDefault(require("../../../../models/subscription/subscription.model"));
// Token limits per plan
const PLAN_TOKEN_LIMITS = {
    free: 5000,
    pro: 50000,
    pro_plus: 500000,
};
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
        // Fetch user details for all users who have usage
        const userIds = Object.keys(usageByUser);
        const users = yield users_model_1.default.find({ _id: { $in: userIds } }, { full_name: 1, profile_picture: 1 }).lean();
        const userMap = {};
        users.forEach((user) => {
            userMap[user._id.toString()] = {
                full_name: user.full_name || "Unknown",
                profile_picture: user.profile_picture || null,
            };
        });
        // Build enriched usage data
        const usageByUserEnriched = Object.entries(usageByUser).map(([userId, tokens]) => {
            var _a, _b;
            return ({
                userId,
                tokens,
                full_name: ((_a = userMap[userId]) === null || _a === void 0 ? void 0 : _a.full_name) || "Unknown",
                profile_picture: ((_b = userMap[userId]) === null || _b === void 0 ? void 0 : _b.profile_picture) || null,
            });
        });
        // Get token limit from subscription
        let tokenLimit = PLAN_TOKEN_LIMITS.free;
        const subscription = yield subscription_model_1.default.findOne({ company_id: company_object_id }).lean();
        if (subscription) {
            const plan = subscription.plan;
            tokenLimit = PLAN_TOKEN_LIMITS[plan] || PLAN_TOKEN_LIMITS.free;
        }
        res.status(200).json({
            success: true,
            data: {
                totalTokens,
                tokenLimit,
                usageByUser: usageByUserEnriched
            }
        });
    }
    catch (error) {
        console.error("Error fetching AI token usage:", error);
        res.status(500).json({ success: false, message: "Internal server error" });
    }
});
exports.getAITokenUsage = getAITokenUsage;
