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
exports.getSocialMetrics = void 0;
const socialMetrics_service_1 = require("../../../../services/social/socialMetrics.service");
const getSocialMetrics = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = req.query.user_id || req.query.userId;
        if (!userId) {
            return res.status(400).json({
                success: false,
                message: "user_id is required",
            });
        }
        const { items, errors } = yield (0, socialMetrics_service_1.fetchSocialMetrics)(userId);
        if (!items.length && (errors === null || errors === void 0 ? void 0 : errors.length)) {
            return res.status(502).json({
                success: false,
                message: "Failed to retrieve social metrics",
                errors,
            });
        }
        return res.status(200).json({
            success: true,
            result: {
                metrics: items,
                errors: errors || [],
            },
        });
    }
    catch (error) {
        console.error("Error fetching social metrics:", error);
        return res.status(500).json({
            success: false,
            message: "Internal server error",
            error: (error === null || error === void 0 ? void 0 : error.message) || String(error),
        });
    }
});
exports.getSocialMetrics = getSocialMetrics;
