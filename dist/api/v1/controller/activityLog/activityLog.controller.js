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
exports.getActivities = void 0;
const activityLog_model_1 = __importDefault(require("../../../../models/activityLog/activityLog.model"));
// GET /api/v1/activity/get-activities?limit=10
const getActivities = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const user = req.user;
        const limit = parseInt(req.query.limit) || 10;
        const activities = yield activityLog_model_1.default.find({
            company_object_id: user.company_object_id,
        })
            .sort({ createdAt: -1 })
            .limit(limit)
            .lean();
        return res.status(200).json({ message: "Activities fetched", data: activities });
    }
    catch (error) {
        console.error("getActivities error:", error);
        return res.status(500).json({ message: "Failed to fetch activities", error: error.message });
    }
});
exports.getActivities = getActivities;
