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
exports.uploadYoutubeVideo = exports.getYoutubeChannelDetails = exports.youtubeCallback = exports.youtubeAuth = void 0;
const googleapis_1 = require("googleapis");
const dotenv_1 = require("dotenv");
const users_model_1 = __importDefault(require("../../../../models/users/users.model"));
const axios_1 = __importDefault(require("axios"));
(0, dotenv_1.config)();
const YT_CLIENT_ID = process.env.YT_CLIENT_ID;
const YT_CLIENT_SECRET = process.env.YT_CLIENT_SECRET;
const YT_REDIRECT_URI = process.env.YT_REDIRECT_URI;
const oauth2Client = new googleapis_1.google.auth.OAuth2(YT_CLIENT_ID, YT_CLIENT_SECRET, YT_REDIRECT_URI);
const youtubeAuth = (req, res) => {
    const appUserId = req.query.user_id;
    const scopes = [
        "https://www.googleapis.com/auth/youtube.upload",
        "https://www.googleapis.com/auth/youtube.readonly",
    ];
    const url = oauth2Client.generateAuthUrl({
        access_type: "offline",
        prompt: "consent",
        scope: scopes,
        state: Buffer.from(appUserId).toString("base64"), // encode user_id
    });
    res.redirect(url);
};
exports.youtubeAuth = youtubeAuth;
const youtubeCallback = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { code, state } = req.query;
    console.log("Code and stste <=======>", code, state);
    const user_id = atob(state);
    console.log("<======> user id : ", user_id);
    console.log(user_id);
    if (!code || typeof code !== "string") {
        return res.status(400).json({
            success: false,
            message: "Authorization code is missing or invalid",
        });
    }
    try {
        const { tokens } = yield oauth2Client.getToken(code);
        oauth2Client.setCredentials(tokens);
        console.log("Access Token:", tokens.access_token);
        console.log("Refresh Token:", tokens.refresh_token);
        if (user_id) {
            const res = yield users_model_1.default.findByIdAndUpdate({ _id: user_id }, { $set: { "youtube.access_token": tokens.refresh_token } }, { new: true });
            console.log("...........", res);
        }
        // res.redirect(
        //   `http://localhost:5173/user-details/youtube-dashboard?token=${tokens.access_token}&user_id=${userId}`
        // );
        res.redirect(`http://localhost:3000/dashboard/social-media?platform=youtube&token=${tokens.access_token}&user_id=${user_id}`);
    }
    catch (error) {
        console.error("Error exchanging code:", error);
        res.status(500).json({
            success: false,
            messge: "Internal server errror!",
        });
    }
});
exports.youtubeCallback = youtubeCallback;
const getYoutubeChannelDetails = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c, _d, _e;
    try {
        const accessToken = (_a = req.headers.authorization) === null || _a === void 0 ? void 0 : _a.split(" ")[1];
        if (!accessToken) {
            return res
                .status(401)
                .json({ success: false, message: "No access token provided" });
        }
        oauth2Client.setCredentials({ access_token: accessToken });
        const youtube = googleapis_1.google.youtube({ version: "v3", auth: oauth2Client });
        // Get the channel of the authenticated user
        const response = yield youtube.channels.list({
            part: ["snippet", "statistics"],
            mine: true,
        });
        console.log("Youtube channel : ", response);
        if (!response.data.items || response.data.items.length === 0) {
            return res
                .status(404)
                .json({ success: false, message: "No channel found" });
        }
        const channel = response.data.items[0];
        const details = {
            id: channel.id,
            name: (_b = channel.snippet) === null || _b === void 0 ? void 0 : _b.title,
            description: (_c = channel.snippet) === null || _c === void 0 ? void 0 : _c.description,
            publishedAt: (_d = channel.snippet) === null || _d === void 0 ? void 0 : _d.publishedAt,
            thumbnails: (_e = channel.snippet) === null || _e === void 0 ? void 0 : _e.thumbnails,
            statistics: channel.statistics,
        };
        res.status(200).json({
            success: true,
            result: details,
        });
    }
    catch (error) {
        console.error("Error fetching channel details:", error);
        res
            .status(500)
            .json({ success: false, message: "Failed to fetch channel details" });
    }
});
exports.getYoutubeChannelDetails = getYoutubeChannelDetails;
// Upload video
const uploadYoutubeVideo = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { user_id, title, description, tags, privacyStatus, videoURL } = req.body;
        if (!user_id) {
            return res.status(400).json({
                success: false,
                message: "User id required",
            });
        }
        if (!videoURL) {
            return res.status(400).json({
                success: false,
                message: "No video URL provided",
            });
        }
        const user = yield users_model_1.default.findById(user_id);
        if (!user) {
            return res.status(401).json({
                success: false,
                message: "User not found",
            });
        }
        if (!user.youtube || !user.youtube.access_token) {
            return res.status(400).json({
                success: false,
                message: "User does not have a valid YouTube access token",
            });
        }
        // Setup OAuth client
        oauth2Client.setCredentials({
            refresh_token: user.youtube.access_token,
        });
        const accessTokenResponse = yield oauth2Client.getAccessToken();
        oauth2Client.setCredentials({
            access_token: (accessTokenResponse === null || accessTokenResponse === void 0 ? void 0 : accessTokenResponse.token) || user.youtube.access_token,
            refresh_token: user.youtube.access_token,
        });
        const youtube = googleapis_1.google.youtube({ version: "v3", auth: oauth2Client });
        const response = yield axios_1.default.get(videoURL, { responseType: "stream" });
        // Upload video to YouTube
        const uploadResponse = yield youtube.videos.insert({
            part: ["snippet", "status"],
            requestBody: {
                snippet: {
                    title: title || "Untitled Video",
                    description: description || "",
                    tags: tags || [],
                },
                status: {
                    privacyStatus: privacyStatus || "public",
                },
            },
            media: {
                body: response.data,
            },
        });
        const videoId = uploadResponse.data.id;
        return res.status(200).json({
            success: true,
            message: "Video uploaded successfully",
            videoId,
            videoUrl: `https://www.youtube.com/watch?v=${videoId}`,
        });
    }
    catch (error) {
        console.error("Error uploading video:", error);
        return res.status(500).json({
            success: false,
            message: "Video upload failed",
            error: error.message,
        });
    }
});
exports.uploadYoutubeVideo = uploadYoutubeVideo;
