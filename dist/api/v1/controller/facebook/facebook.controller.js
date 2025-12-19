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
exports.postFacebookUniversal = exports.getAccessTokenLongTerm = exports.fetchFacebookPages = exports.facebookAuthCallback = exports.facebookLogin = void 0;
const facebook_service_1 = require("../../../../services/facebook/facebook.service");
const axios_1 = __importDefault(require("axios"));
const uploadFile_1 = require("../../../../services/uploadFile/uploadFile");
const users_model_1 = __importDefault(require("../../../../models/users/users.model"));
const FACEBOOK_GRAPH_URL = "https://graph.facebook.com/v20.0";
const facebookLogin = (req, res) => {
    const { user_id } = req.query;
    console.log("=====>userId", user_id);
    console.log("user_id", user_id);
    if (!user_id)
        return res.status(400).json({ error: "Client ID is required" });
    const authUrl = (0, facebook_service_1.getFacebookAuthURL)(user_id);
    res.redirect(authUrl);
};
exports.facebookLogin = facebookLogin;
const facebookAuthCallback = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { code, state } = req.query;
        console.log("===>called state", state);
        console.log("Facebook callback code and state : ", code, state);
        if (!code)
            return res.status(400).json({ error: "No code provided" });
        // Exchange code for access token & user data
        const { tokens, user } = yield (0, facebook_service_1.getFacebookUser)(code);
        console.log("====>state : ", state);
        const userId = atob(state);
        // Redirect to frontend with token & pages as query params
        res.redirect(`http://localhost:3000/dashboard/social-media?platform=facebook&token=${tokens.access_token}&user=${encodeURIComponent(JSON.stringify(user))}&user_id=${userId}`);
    }
    catch (error) {
        console.error("OAuth authentication failed:", error);
        res.status(500).json({ error: "OAuth authentication failed" });
    }
});
exports.facebookAuthCallback = facebookAuthCallback;
/**
 * Fetch Facebook Pages
 */
const fetchFacebookPages = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c;
    try {
        console.log("fetchFacebookPages called");
        const userAccessToken = (_a = req.headers.authorization) === null || _a === void 0 ? void 0 : _a.split("Bearer ")[1];
        const userId = req.query.userId;
        console.log("===========>", userId);
        if (!userAccessToken) {
            return res
                .status(401)
                .json({ error: "Unauthorized - Missing Facebook Token" });
        }
        if (!userId) {
            return res.status(400).json({ error: "Missing userId in query" });
        }
        // Get long-lived token
        const longTokenResponse = yield (0, facebook_service_1.getLongLivedToken)(userAccessToken);
        const longLivedToken = (longTokenResponse === null || longTokenResponse === void 0 ? void 0 : longTokenResponse.access_token) || longTokenResponse;
        //  Save token & fetch pages in parallel
        const [savedUser, pagesResponse] = yield Promise.all([
            users_model_1.default.findByIdAndUpdate(userId, { $set: { "facebook.access_token": longLivedToken } }, { new: true }),
            axios_1.default.get(`https://graph.facebook.com/v18.0/me/accounts?fields=id,name,access_token&access_token=${longLivedToken}`),
        ]);
        console.log("Saved user token : ", savedUser);
        return res.json({
            message: "Token saved and pages fetched successfully",
            user: savedUser,
            result: pagesResponse.data.data,
        });
    }
    catch (error) {
        console.error("Error saving token or fetching pages:", ((_b = error.response) === null || _b === void 0 ? void 0 : _b.data) || error.message);
        return res.status(500).json({
            error: "Failed to save token or fetch pages",
            details: ((_c = error.response) === null || _c === void 0 ? void 0 : _c.data) || error.message,
        });
    }
});
exports.fetchFacebookPages = fetchFacebookPages;
// Get long Live Access Token
const getAccessTokenLongTerm = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _d;
    try {
        const userPayload = req.body;
        const AccessToken = (_d = req.headers.authorization) === null || _d === void 0 ? void 0 : _d.split("Bearer ")[1];
        if (!AccessToken) {
            return res
                .status(401)
                .json({ error: "Unauthorized - Missing Facebook Token" });
        }
        const response = yield (0, facebook_service_1.getLongLivedToken)(AccessToken);
        if (req.query.user_id) {
            yield users_model_1.default.findByIdAndUpdate({ _id: req.query.user_id }, { $set: userPayload }, { new: true });
        }
        console.log("Long Lived token response : ", response);
        res.status(200).json({
            success: true,
            message: "Successfully get access token",
            token: response,
        });
    }
    catch (error) {
        console.error(error);
        res.status(500).json({
            success: false,
            message: "Internal server error!...",
        });
    }
});
exports.getAccessTokenLongTerm = getAccessTokenLongTerm;
// Universal Facebook post: text, image, or video
const postFacebookUniversal = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _e, _f, _g, _h, _j, _k;
    try {
        const { userId, pageId, message, imageUrl, videoURL } = req.body;
        const uploadedImage = (_f = (_e = req.files) === null || _e === void 0 ? void 0 : _e.image) === null || _f === void 0 ? void 0 : _f[0];
        const uploadedVideo = (_h = (_g = req.files) === null || _g === void 0 ? void 0 : _g.video) === null || _h === void 0 ? void 0 : _h[0];
        if (!userId || !pageId) {
            return res.status(400).json({ error: "userId and pageId are required" });
        }
        // Get page access token
        const { pageAccessToken, id } = yield (0, facebook_service_1.getPageTokenService)(userId, pageId);
        // Priority: if message only, post text; if image present (file or url), post image; if video present, post video
        if (message && !uploadedImage && !uploadedVideo && !imageUrl && !videoURL) {
            // Text only
            const postRes = yield axios_1.default.post(`${FACEBOOK_GRAPH_URL}/${id}/feed`, {
                message,
                access_token: pageAccessToken,
            });
            return res.status(200).json({ success: true, postId: postRes.data.id, message: "Text posted" });
        }
        // If image file uploaded -> upload to S3, save to user, post via URL
        if (uploadedImage || imageUrl) {
            let finalImageUrl = imageUrl;
            if (uploadedImage) {
                finalImageUrl = yield (0, uploadFile_1.uploadFileToS3Service)(`facebook_uploads/${userId}`, uploadedImage.buffer, uploadedImage.mimetype || "image/jpeg");
                try {
                    yield users_model_1.default.findByIdAndUpdate(userId, { $set: { "facebook.last_uploaded_image": finalImageUrl } });
                }
                catch (dbErr) {
                    console.warn("Failed to save image URL:", dbErr);
                }
            }
            const imgRes = yield axios_1.default.post(`${FACEBOOK_GRAPH_URL}/${id}/photos`, {
                url: finalImageUrl,
                caption: message || "",
                access_token: pageAccessToken,
            });
            return res.status(200).json({ success: true, postId: imgRes.data.id, message: "Image posted" });
        }
        // If video file uploaded or videoURL provided -> upload to S3 (if file), then post via graph-video endpoint
        if (uploadedVideo || videoURL) {
            let finalVideoUrl = videoURL;
            if (uploadedVideo) {
                finalVideoUrl = yield (0, uploadFile_1.uploadFileToS3Service)(`facebook_uploads/${userId}`, uploadedVideo.buffer, uploadedVideo.mimetype || "video/mp4");
                try {
                    yield users_model_1.default.findByIdAndUpdate(userId, { $set: { "facebook.last_uploaded_video": finalVideoUrl } });
                }
                catch (dbErr) {
                    console.warn("Failed to save video URL:", dbErr);
                }
            }
            const uploadUrl = `https://graph-video.facebook.com/v19.0/${id}/videos`;
            const resp = yield axios_1.default.post(uploadUrl, {
                file_url: finalVideoUrl,
                title: message || "",
            }, {
                headers: { Authorization: `Bearer ${pageAccessToken}` },
            });
            return res.status(200).json({ success: true, videoId: resp.data.id, message: "Video posted" });
        }
        return res.status(400).json({ error: "No valid content to post" });
    }
    catch (error) {
        console.error("Universal Facebook post error:", ((_j = error.response) === null || _j === void 0 ? void 0 : _j.data) || error.message);
        return res.status(500).json({ success: false, error: ((_k = error.response) === null || _k === void 0 ? void 0 : _k.data) || error.message });
    }
});
exports.postFacebookUniversal = postFacebookUniversal;
