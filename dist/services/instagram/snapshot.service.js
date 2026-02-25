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
exports.getSnapshot = exports.fetchAndStoreInstagramData = void 0;
const users_model_1 = __importDefault(require("../../models/users/users.model"));
const socialData_model_1 = __importDefault(require("../../models/socialData/socialData.model"));
const dashboard_builder_1 = require("./dashboard.builder");
const fetchAndStoreInstagramData = (userId) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const user = yield users_model_1.default.findById(userId).exec();
        if (!user || !((_a = user.instagram) === null || _a === void 0 ? void 0 : _a.access_token)) {
            throw new Error("Instagram access token not found for user.");
        }
        const igUserId = user.instagram.project_id || "me";
        const resultData = yield (0, dashboard_builder_1.buildInstagramDashboardBuilder)(igUserId, user.instagram.access_token);
        yield socialData_model_1.default.findOneAndUpdate({ user_object_id: userId, platform_name: "instagram", platform_id: igUserId }, {
            $set: {
                data: resultData,
                is_active: true,
                last_synced_at: new Date(),
                updatedAt: new Date(),
            },
        }, { upsert: true });
        return resultData;
    }
    catch (error) {
        console.error("Error in fetchAndStoreInstagramData:", error);
        throw error;
    }
});
exports.fetchAndStoreInstagramData = fetchAndStoreInstagramData;
const getSnapshot = (userId_1, ...args_1) => __awaiter(void 0, [userId_1, ...args_1], void 0, function* (userId, platform = "instagram") {
    return yield socialData_model_1.default.findOne({ user_object_id: userId, platform_name: platform });
});
exports.getSnapshot = getSnapshot;
