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
exports.publishInstagramPost = exports.fetchInstagramProfileController = exports.instagramAuthCallback = exports.instagrmaLogin = void 0;
const instagram_service_1 = require("../../../../services/instagram/instagram.service");
const users_model_1 = __importDefault(require("../../../../models/users/users.model"));
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
        res.redirect(`http://localhost:3000/dashboard/social-media?platform=instagram&token=${tokens.access_token}&user_id=${userId}`);
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
        const [savedUser, profile] = yield Promise.all([
            users_model_1.default.findByIdAndUpdate(userId, { $set: { "instagram.access_token": longLivedToken } }, { new: true }),
            (0, instagram_service_1.getInstagramProfile)(longLivedToken),
        ]);
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
        const { access_token, igUserId, image_url, caption } = req.body;
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
