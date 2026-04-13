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
exports.disconnectInstagram = exports.publishInstagramPost = exports.fetchInstagramProfileController = exports.instagramAuthCallback = exports.instagrmaLogin = void 0;
const instagram_service_1 = require("../../../../services/instagram/instagram.service");
const users_model_1 = __importDefault(require("../../../../models/users/users.model"));
const postedContent_model_1 = __importDefault(require("../../../../models/postedContent/postedContent.model"));
const instagrmaLogin = (req, res) => {
    const { user_id } = req.query;
    console.log("user_id", user_id);
    if (!user_id)
        return res.status(400).json({ error: "Client ID is required" });
    const authUrl = (0, instagram_service_1.getInstagramAuthURL)(user_id);
    res.redirect(authUrl);
};
exports.instagrmaLogin = instagrmaLogin;
const instagramAuthCallback = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { code, state } = req.query;
        console.log("Instagram code and stste : ", code, state);
        if (!code)
            return res.status(400).json({ error: "No code provided" });
        // Exchange code for access token & user data
        const { tokens } = yield (0, instagram_service_1.getInstagramUser)(code);
        console.log("====>state : ", state);
        const userId = state ? atob(state) : null;
        // Redirect to frontend with token & pages as query params
        res.redirect(`${process.env.FRONTEND_URL}/dashboard/social-media?platform=instagram&token=${tokens.access_token}&user_id=${userId}`);
    }
    catch (error) {
        console.error("OAuth authentication failed:", error);
        res.status(500).json({ error: "OAuth authentication failed" });
    }
});
exports.instagramAuthCallback = instagramAuthCallback;
const fetchInstagramProfileController = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { access_token, userId } = req.query;
        if (!access_token || typeof access_token !== "string") {
            return res.status(400).json({ error: "Access token is required" });
        }
        if (!userId) {
            return res.status(400).json({ error: "Missing userId in query" });
        }
        const longTokenResponse = yield (0, instagram_service_1.getInstagramLongLivedToken)(access_token);
        console.log(longTokenResponse);
        const longLivedToken = longTokenResponse.access_token;
        const profile = yield (0, instagram_service_1.getInstagramProfile)(longLivedToken);
        const savedUser = yield users_model_1.default.findByIdAndUpdate(userId, {
            $set: {
                "instagram.access_token": longLivedToken,
                "instagram.project_id": (profile === null || profile === void 0 ? void 0 : profile.id) || null,
                "instagram.name": (profile === null || profile === void 0 ? void 0 : profile.name) || null,
            },
        }, { new: true });
        console.log(savedUser);
        res.status(200).json({
            success: true,
            user: savedUser,
            result: profile,
        });
    }
    catch (error) {
        console.error("Failed to get Instagram profile:", error.message);
        res.status(500).json({ error: "Failed to fetch Instagram profile" });
    }
});
exports.fetchInstagramProfileController = fetchInstagramProfileController;
const publishInstagramPost = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { access_token, igUserId, image_url, caption, userId } = req.body;
        if (!access_token || !igUserId || !image_url) {
            return res
                .status(400)
                .json({ error: "access_token, igUserId and image_url are required" });
        }
        const container = yield (0, instagram_service_1.createInstagramMedia)({
            accessToken: access_token,
            igUserId,
            imageUrl: image_url,
            caption,
        });
        const published = yield (0, instagram_service_1.publishInstagramMedia)({
            accessToken: access_token,
            igUserId,
            containerId: container.id,
        });
        // Save to history
        if (userId) {
            yield postedContent_model_1.default.create({
                user_id: userId,
                platform: "instagram",
                content: caption || "",
                media_urls: [image_url],
                media_type: "image",
                posted_at: new Date(),
                platform_post_id: published.id,
                is_scheduled: false,
                status: "published",
            });
        }
        res.status(200).json({
            success: true,
            message: "Instagrma post published successfully....",
            containerId: container.id,
            postId: published.id,
        });
    }
    catch (error) {
        console.error("Failed to publish Instagram post:", error.message);
        res.status(500).json({
            error: "Failed to publish Instagram post",
        });
    }
});
exports.publishInstagramPost = publishInstagramPost;
const disconnectInstagram = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c, _d;
    try {
        const userId = ((_a = req.body) === null || _a === void 0 ? void 0 : _a.userId) ||
            ((_b = req.body) === null || _b === void 0 ? void 0 : _b.user_id) ||
            ((_c = req.query) === null || _c === void 0 ? void 0 : _c.userId) ||
            ((_d = req.query) === null || _d === void 0 ? void 0 : _d.user_id);
        if (!userId) {
            return res.status(400).json({
                success: false,
                message: "userId is required",
            });
        }
        const user = yield users_model_1.default.findById(userId).exec();
        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found",
            });
        }
        const updatedUser = yield users_model_1.default.findByIdAndUpdate(userId, {
            $set: {
                "instagram.project_id": null,
                "instagram.name": null,
                "instagram.access_token": null,
            },
        }, { new: true }).exec();
        return res.status(200).json({
            success: true,
            message: "Instagram disconnected successfully",
            user: updatedUser,
        });
    }
    catch (error) {
        console.error("Error disconnecting Instagram:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to disconnect Instagram",
            error: error === null || error === void 0 ? void 0 : error.message,
        });
    }
});
exports.disconnectInstagram = disconnectInstagram;
