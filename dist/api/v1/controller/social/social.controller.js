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
exports.getInstagramDashboard = exports.syncInstagram = exports.getFacebookDashboard = exports.getYoutubeDashboard = exports.syncFacebook = exports.syncYoutube = exports.getSocialMetrics = void 0;
const socialMetrics_service_1 = require("../../../../services/social/socialMetrics.service");
const snapshot_service_1 = require("../../../../services/youtube/snapshot.service");
const snapshot_service_2 = require("../../../../services/facebook/snapshot.service");
const snapshot_service_3 = require("../../../../services/instagram/snapshot.service");
const content_service_1 = require("../../../../services/facebook/content.service");
const content_service_2 = require("../../../../services/instagram/content.service");
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
/**
 * Sync YouTube data for a user
 */
const syncYoutube = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = req.query.user_id || req.query.userId;
        if (!userId) {
            return res.status(400).json({
                success: false,
                message: "user_id is required",
            });
        }
        const data = yield (0, snapshot_service_1.fetchAndStoreYoutubeData)(userId);
        if (data) {
            console.log("YouTube data synchronized successfully", data);
        }
        return res.status(200).json({
            success: true,
            message: "YouTube data synchronized successfully",
            result: data,
        });
    }
    catch (error) {
        console.error("Error in syncYoutube controller:", error);
        return res.status(500).json({
            success: false,
            message: error.message || "Internal server error during YouTube sync",
        });
    }
});
exports.syncYoutube = syncYoutube;
/**
 * Sync Facebook data for a user
 */
const syncFacebook = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = req.query.user_id || req.query.userId;
        const pageId = req.query.page_id || req.query.pageId;
        if (!userId || !pageId) {
            return res.status(400).json({
                success: false,
                message: "user_id and page_id are required",
            });
        }
        const data = yield (0, snapshot_service_2.fetchAndStoreFacebookData)(userId, pageId);
        // Also update engagement for all existing Facebook posts in our database
        try {
            yield (0, content_service_1.updateFbAllPostsEngagement)(userId);
        }
        catch (engagementErr) {
            console.error("Error updating Facebook post engagement during sync:", engagementErr.message);
            // We don't fail the whole sync if only engagement update fails
        }
        if (data) {
            console.log("Facebook data synchronized successfully", data);
        }
        return res.status(200).json({
            success: true,
            message: "Facebook data synchronized successfully",
            result: data,
        });
    }
    catch (error) {
        console.error("Error in syncFacebook controller:", error);
        return res.status(500).json({
            success: false,
            message: error.message || "Internal server error during Facebook sync",
        });
    }
});
exports.syncFacebook = syncFacebook;
/**
 * Get YouTube dashboard data for a user
 */
const getYoutubeDashboard = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = req.query.user_id || req.query.userId;
        if (!userId) {
            return res.status(400).json({
                success: false,
                message: "user_id is required",
            });
        }
        const data = yield (0, snapshot_service_1.getSnapshot)(userId);
        return res.status(200).json({
            success: true,
            result: data,
        });
    }
    catch (error) {
        console.error("Error in getYoutubeDashboard controller:", error);
        return res.status(500).json({
            success: false,
            message: error.message || "Internal server error during YouTube dashboard retrieval",
        });
    }
});
exports.getYoutubeDashboard = getYoutubeDashboard;
/**
 * Get Facebook dashboard data for a user
 */
const getFacebookDashboard = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = req.query.user_id || req.query.userId;
        if (!userId) {
            return res.status(400).json({
                success: false,
                message: "user_id is required",
            });
        }
        const data = yield (0, snapshot_service_2.getSnapshot)(userId);
        return res.status(200).json({
            success: true,
            result: data,
        });
    }
    catch (error) {
        console.error("Error in getFacebookDashboard controller:", error);
        return res.status(500).json({
            success: false,
            message: error.message || "Internal server error during Facebook dashboard retrieval",
        });
    }
});
exports.getFacebookDashboard = getFacebookDashboard;
/**
 * Sync Instagram data for a user
 */
const syncInstagram = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = req.query.user_id || req.query.userId;
        if (!userId) {
            return res.status(400).json({
                success: false,
                message: "user_id is required", // project_id/igUserId is stored in UserModel
            });
        }
        const data = yield (0, snapshot_service_3.fetchAndStoreInstagramData)(userId);
        // Also update engagement for all existing Instagram posts in our database
        try {
            yield (0, content_service_2.updateInstagramAllPostsEngagement)(userId);
        }
        catch (engagementErr) {
            console.error("Error updating Instagram post engagement during sync:", engagementErr.message);
            // We don't fail the whole sync if only engagement update fails
        }
        if (data) {
            console.log("Instagram data synchronized successfully", data);
        }
        return res.status(200).json({
            success: true,
            message: "Instagram data synchronized successfully",
            result: data,
        });
    }
    catch (error) {
        console.error("Error in syncInstagram controller:", error);
        return res.status(500).json({
            success: false,
            message: error.message || "Internal server error during Instagram sync",
        });
    }
});
exports.syncInstagram = syncInstagram;
/**
 * Get Instagram dashboard data for a user
 */
const getInstagramDashboard = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = req.query.user_id || req.query.userId;
        if (!userId) {
            return res.status(400).json({
                success: false,
                message: "user_id is required",
            });
        }
        const data = yield (0, snapshot_service_3.getSnapshot)(userId);
        return res.status(200).json({
            success: true,
            result: data,
        });
    }
    catch (error) {
        console.error("Error in getInstagramDashboard controller:", error);
        return res.status(500).json({
            success: false,
            message: error.message || "Internal server error during Instagram dashboard retrieval",
        });
    }
});
exports.getInstagramDashboard = getInstagramDashboard;
