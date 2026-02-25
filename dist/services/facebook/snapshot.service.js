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
exports.getSnapshot = exports.fetchAndStoreFacebookData = void 0;
const facebook_service_1 = require("./facebook.service");
const dashboard_builder_1 = require("./dashboard.builder");
const socialData_model_1 = __importDefault(require("../../models/socialData/socialData.model"));
/**
 * Fetch and store Facebook data for a user
 */
const fetchAndStoreFacebookData = (userId, pageId) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { pageAccessToken, id: resolvedPageId } = yield (0, facebook_service_1.getPageTokenService)(userId, pageId);
        const pid = resolvedPageId || pageId;
        // Use existing dashboard builder to fetch all metrics
        const resultData = yield (0, dashboard_builder_1.buildFacebookDashboardBuilder)(pid, pageAccessToken, "28d");
        // // Update engagement for posted content if available
        // if (resultData.content?.publishedContent) {
        //   await Promise.all(
        //     resultData.content.publishedContent.map(async (item: any) => {
        //       if (item.type === "video" && item.views !== undefined) {
        //          await PostedContentModel.findOneAndUpdate(
        //           { platform_post_id: item.id, platform: "facebook", user_id: userId },
        //           {
        //             $set: {
        //               engagement: {
        //                 views: Number(item.views || 0),
        //               },
        //             },
        //           },
        //         );
        //       }
        //     })
        //   );
        // }
        // Update snapshot in SocialDataModel
        yield socialData_model_1.default.findOneAndUpdate({ user_object_id: userId, platform_name: "facebook", platform_id: pid }, {
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
        console.error("Error in fetchAndStoreFacebookData:", error);
        throw error;
    }
});
exports.fetchAndStoreFacebookData = fetchAndStoreFacebookData;
/**
 * Daily cron to update snapshots for all connected Facebook users.
 */
// export const dailyFacebookSnapshotCron = async () => {
//   console.log("[FacebookSnapshotService] Starting daily Facebook snapshot cron...");
//   // Find users who have facebook connected and a project_id (pageId)
//   const users = await UserModel.find({ 
//       "facebook.access_token": { $ne: null },
//       "facebook.project_id": { $ne: null }
//     })
//     .select({ _id: 1, "facebook.project_id": 1 })
//     .lean();
//   for (const u of users as any[]) {
//     try {
//       console.log(`[FacebookSnapshotService] Syncing snapshot for user: ${u._id}`);
//       await fetchAndStoreFacebookData(u._id.toString(), u.facebook.project_id);
//     } catch (err: any) {
//       console.error(
//         `[FacebookSnapshotService] Failed to sync snapshot for user ${u._id}:`,
//         err.message,
//       );
//     }
//   }
//   console.log("[FacebookSnapshotService] Daily Facebook snapshot cron completed.");
// };
const getSnapshot = (userId_1, ...args_1) => __awaiter(void 0, [userId_1, ...args_1], void 0, function* (userId, platform = "facebook") {
    return yield socialData_model_1.default.findOne({ user_object_id: userId, platform_name: platform });
});
exports.getSnapshot = getSnapshot;
