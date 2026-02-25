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
exports.disconnectInstagram = exports.postInstagramUniversal = exports.publishInstagramPost = exports.fetchInstagramProfileController = exports.instagramAuthCallback = exports.instagramLogin = void 0;
const axios_1 = __importDefault(require("axios"));
const uploadFile_1 = require("../../../../services/uploadFile/uploadFile");
const instagram_service_1 = require("../../../../services/instagram/instagram.service");
const users_model_1 = __importDefault(require("../../../../models/users/users.model"));
const postedContent_model_1 = __importDefault(require("../../../../models/postedContent/postedContent.model"));
const instagramLogin = (req, res) => {
    const { user_id } = req.query;
    console.log("user_id", user_id);
    if (!user_id)
        return res.status(400).json({ error: "Client ID is required" });
    const authUrl = (0, instagram_service_1.getInstagramAuthURL)(user_id);
    res.redirect(authUrl);
};
exports.instagramLogin = instagramLogin;
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
        if (userId) {
            try {
                const profile = yield (0, instagram_service_1.getInstagramProfile)(tokens.access_token);
                yield users_model_1.default.findByIdAndUpdate(userId, {
                    $set: {
                        "instagram.project_id": profile.id,
                        "instagram.name": profile.username,
                        "instagram.access_token": tokens.access_token,
                    },
                });
            }
            catch (profileError) {
                console.error("Failed to store Instagram profile details:", profileError);
            }
        }
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
        const [savedUser, profile] = yield Promise.all([
            users_model_1.default.findByIdAndUpdate(userId, { $set: { "instagram.access_token": longLivedToken } }, { new: true }),
            (0, instagram_service_1.getInstagramProfile)(longLivedToken),
        ]);
        console.log(savedUser);
        res.status(200).json({
            success: true,
            // user: savedUser,
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
        // Wait for media to be ready
        let status = "IN_PROGRESS";
        let attempts = 0;
        while (status !== "FINISHED" && attempts < 30) {
            if (attempts > 0)
                yield new Promise((res) => setTimeout(res, 5000));
            const statusData = yield (0, instagram_service_1.getInstagramMediaStatus)({
                accessToken: access_token,
                containerId: container.id,
            });
            status = statusData.status_code;
            if (status === "ERROR")
                throw new Error("Media processing failed");
            attempts++;
        }
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
            message: "Instagram post published successfully....",
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
// Universal Instagram post: image or video
const postInstagramUniversal = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c, _d, _e, _f, _g, _h;
    try {
        const { userId, message, imageUrl, videoURL } = req.body;
        const uploadedImage = (_b = (_a = req.files) === null || _a === void 0 ? void 0 : _a.image) === null || _b === void 0 ? void 0 : _b[0];
        const uploadedVideo = (_d = (_c = req.files) === null || _c === void 0 ? void 0 : _c.video) === null || _d === void 0 ? void 0 : _d[0];
        if (!userId) {
            return res.status(400).json({ error: "userId is required" });
        }
        const user = yield users_model_1.default.findById(userId).exec();
        if (!user || !((_e = user.instagram) === null || _e === void 0 ? void 0 : _e.access_token) || !((_f = user.instagram) === null || _f === void 0 ? void 0 : _f.project_id)) {
            return res.status(400).json({ error: "Instagram account not connected or missing credentials" });
        }
        const igAccessToken = user.instagram.access_token;
        const igUserId = user.instagram.project_id;
        if (!uploadedImage && !imageUrl && !uploadedVideo && !videoURL) {
            return res.status(400).json({ error: "An image or video is required for Instagram" });
        }
        let finalMediaUrl = "";
        let mediaType = "IMAGE";
        if (uploadedImage || imageUrl) {
            mediaType = "IMAGE";
            finalMediaUrl = imageUrl || "";
            if (uploadedImage) {
                finalMediaUrl = (yield (0, uploadFile_1.uploadFileToS3Service)(`instagram_uploads/${userId}`, uploadedImage.buffer, uploadedImage.mimetype || "image/jpeg")) || "";
            }
        }
        else if (uploadedVideo || videoURL) {
            mediaType = "REELS";
            finalMediaUrl = videoURL || "";
            if (uploadedVideo) {
                finalMediaUrl = (yield (0, uploadFile_1.uploadFileToS3Service)(`instagram_uploads/${userId}`, uploadedVideo.buffer, uploadedVideo.mimetype || "video/mp4")) || "";
            }
        }
        // Create media container
        const container = yield (0, instagram_service_1.createInstagramMedia)({
            accessToken: igAccessToken,
            igUserId,
            imageUrl: mediaType === "IMAGE" ? finalMediaUrl : undefined,
            videoUrl: mediaType === "REELS" ? finalMediaUrl : undefined,
            caption: message,
            mediaType,
        });
        // Wait for media to be ready (especially for videos)
        let status = "IN_PROGRESS";
        let attempts = 0;
        while (status !== "FINISHED" && attempts < 40) {
            if (attempts > 0)
                yield new Promise((res) => setTimeout(res, 5000));
            const statusData = yield (0, instagram_service_1.getInstagramMediaStatus)({
                accessToken: igAccessToken,
                containerId: container.id,
            });
            status = statusData.status_code;
            if (status === "ERROR")
                throw new Error("Media processing failed");
            if (status === "FINISHED")
                break;
            attempts++;
        }
        const published = yield (0, instagram_service_1.publishInstagramMedia)({
            accessToken: igAccessToken,
            igUserId,
            containerId: container.id,
        });
        // Save to history
        yield postedContent_model_1.default.create({
            user_id: userId,
            platform: "instagram",
            content: message || "",
            media_urls: [finalMediaUrl],
            media_type: mediaType === "IMAGE" ? "image" : "video",
            posted_at: new Date(),
            platform_post_id: published.id,
            is_scheduled: false,
            status: "published",
        });
        return res.status(200).json({
            success: true,
            postId: published.id,
            message: `${mediaType === "IMAGE" ? "Image" : "Video"} posted`,
        });
    }
    catch (error) {
        console.error("Universal Instagram post error:", ((_g = error.response) === null || _g === void 0 ? void 0 : _g.data) || error.message);
        return res.status(500).json({ success: false, error: ((_h = error.response) === null || _h === void 0 ? void 0 : _h.data) || error.message });
    }
});
exports.postInstagramUniversal = postInstagramUniversal;
// Disconnect Instagram Account
const disconnectInstagram = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _j, _k, _l, _m, _o, _p;
    try {
        const userId = ((_j = req.body) === null || _j === void 0 ? void 0 : _j.userId) ||
            ((_k = req.body) === null || _k === void 0 ? void 0 : _k.user_id) ||
            ((_l = req.query) === null || _l === void 0 ? void 0 : _l.userId) ||
            ((_m = req.query) === null || _m === void 0 ? void 0 : _m.user_id);
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
        const tokenToRevoke = (_o = user.instagram) === null || _o === void 0 ? void 0 : _o.access_token;
        const updatedUser = yield users_model_1.default.findByIdAndUpdate(userId, {
            $set: {
                "instagram.project_id": null,
                "instagram.name": null,
                "instagram.access_token": null,
            },
        }, { new: true }).exec();
        if (tokenToRevoke) {
            try {
                // Revoke app permissions for the user
                // Using graph.instagram.com as tokens are now native to this endpoint
                yield axios_1.default.delete(`https://graph.instagram.com/v18.0/me/permissions`, {
                    headers: { Authorization: `Bearer ${tokenToRevoke}` },
                });
            }
            catch (revokeErr) {
                console.warn("Failed to revoke Instagram token:", ((_p = revokeErr === null || revokeErr === void 0 ? void 0 : revokeErr.response) === null || _p === void 0 ? void 0 : _p.data) || (revokeErr === null || revokeErr === void 0 ? void 0 : revokeErr.message) || revokeErr);
            }
        }
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
            error: error.message,
        });
    }
});
exports.disconnectInstagram = disconnectInstagram;
