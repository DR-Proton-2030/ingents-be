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
exports.deleteYoutubeVideo = exports.getYoutubeAllDetails = exports.getChannelStatistics = exports.getSingleVideoAnalytics = exports.getVideoStatistics = exports.getUserSubscriptions = exports.getRecentSubscribers = exports.getSubscribers = exports.replyToYoutubeComment = exports.addVideoComment = exports.getVideoComments = exports.getAllYoutubeVideos = exports.uploadYoutubeVideo = exports.getYoutubeChannelDetails = exports.disconnectYoutube = exports.youtubeCallback = exports.youtubeAuth = void 0;
const googleapis_1 = require("googleapis");
const stream_1 = require("stream");
const dotenv_1 = require("dotenv");
const users_model_1 = __importDefault(require("../../../../models/users/users.model"));
const postedContent_model_1 = __importDefault(require("../../../../models/postedContent/postedContent.model"));
const scheduledPost_model_1 = __importDefault(require("../../../../models/scheduledPost/scheduledPost.model"));
const axios_1 = __importDefault(require("axios"));
const youtube_service_1 = require("../../../../services/youtube/youtube.service");
const videoAnalytics_service_1 = require("../../../../services/youtube/videoAnalytics.service");
const channel_1 = require("../../../../services/youtube/data/channel");
const dates_1 = require("../../../../services/youtube/utils/dates");
const uploads_1 = require("../../../../services/youtube/data/uploads");
const videos_1 = require("../../../../services/youtube/data/videos");
const iso_1 = require("../../../../services/youtube/utils/iso");
const rows_1 = require("../../../../services/youtube/utils/rows");
const geography_1 = require("../../../../services/youtube/analytics/geography");
const overview_1 = require("../../../../services/youtube/analytics/overview");
const audience_1 = require("../../../../services/youtube/analytics/audience");
const traffic_1 = require("../../../../services/youtube/analytics/traffic");
const products_1 = require("../../../../services/youtube/analytics/products");
const retention_1 = require("../../../../services/youtube/analytics/retention");
const reach_1 = require("../../../../services/youtube/analytics/reach");
const content_1 = require("../../../../services/youtube/analytics/content");
(0, dotenv_1.config)();
const YT_CLIENT_ID = process.env.YT_CLIENT_ID;
const YT_CLIENT_SECRET = process.env.YT_CLIENT_SECRET;
const YT_REDIRECT_URI = process.env.YT_REDIRECT_URI;
const oauth2Client = new googleapis_1.google.auth.OAuth2(YT_CLIENT_ID, YT_CLIENT_SECRET, YT_REDIRECT_URI);
const youtubeAuth = (req, res) => {
    const appUserId = req.query.user_id;
    if (!appUserId) {
        return res.status(400).json({
            success: false,
            message: "user_id is required",
        });
    }
    const scopes = [
        "https://www.googleapis.com/auth/youtube",
        "https://www.googleapis.com/auth/youtube.readonly",
        "https://www.googleapis.com/auth/youtube.upload",
        "https://www.googleapis.com/auth/youtube.force-ssl",
        "https://www.googleapis.com/auth/yt-analytics.readonly",
        "https://www.googleapis.com/auth/userinfo.profile",
        "https://www.googleapis.com/auth/userinfo.email",
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
    console.log("Code and state <=======>", code, state);
    if (!state || typeof state !== "string") {
        return res.status(400).json({
            success: false,
            message: "State parameter is missing",
        });
    }
    const user_id = atob(state);
    console.log("<======> user id : ", user_id);
    // Validate user_id is a valid ObjectId (24 hex characters)
    if (!user_id ||
        user_id === "undefined" ||
        !/^[a-fA-F0-9]{24}$/.test(user_id)) {
        return res.status(400).json({
            success: false,
            message: "Invalid user_id in state parameter",
        });
    }
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
            const updateData = {};
            if (tokens.refresh_token) {
                updateData["youtube.access_token"] = tokens.refresh_token;
            }
            if (Object.keys(updateData).length > 0) {
                yield users_model_1.default.findByIdAndUpdate({ _id: user_id }, { $set: updateData }, { new: true });
            }
        }
        // res.redirect(
        //   `http://localhost:5173/user-details/youtube-dashboard?token=${tokens.access_token}&user_id=${userId}`
        // );
        res.redirect(`${process.env.FRONTEND_URL}/dashboard/social-media?platform=youtube&token=${tokens.access_token}&user_id=${user_id}`);
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
const disconnectYoutube = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c, _d, _e, _f;
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
        const tokenToRevoke = (_e = user.youtube) === null || _e === void 0 ? void 0 : _e.access_token;
        const updatedUser = yield users_model_1.default.findByIdAndUpdate(userId, {
            $set: {
                "youtube.project_id": null,
                "youtube.name": null,
                "youtube.access_token": null,
            },
        }, { new: true }).exec();
        if (tokenToRevoke) {
            try {
                yield axios_1.default.post("https://oauth2.googleapis.com/revoke", new URLSearchParams({ token: tokenToRevoke }), {
                    headers: {
                        "Content-Type": "application/x-www-form-urlencoded",
                    },
                });
            }
            catch (revokeErr) {
                console.warn("Failed to revoke YouTube token:", ((_f = revokeErr === null || revokeErr === void 0 ? void 0 : revokeErr.response) === null || _f === void 0 ? void 0 : _f.data) || (revokeErr === null || revokeErr === void 0 ? void 0 : revokeErr.message) || revokeErr);
            }
        }
        return res.status(200).json({
            success: true,
            message: "YouTube disconnected successfully",
            user: updatedUser,
        });
    }
    catch (error) {
        console.error("Error disconnecting YouTube:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to disconnect YouTube",
            error: error.message,
        });
    }
});
exports.disconnectYoutube = disconnectYoutube;
const getYoutubeChannelDetails = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _g, _h, _j, _k, _l;
    try {
        const accessToken = (_g = req.headers.authorization) === null || _g === void 0 ? void 0 : _g.split(" ")[1];
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
            name: (_h = channel.snippet) === null || _h === void 0 ? void 0 : _h.title,
            description: (_j = channel.snippet) === null || _j === void 0 ? void 0 : _j.description,
            publishedAt: (_k = channel.snippet) === null || _k === void 0 ? void 0 : _k.publishedAt,
            thumbnails: (_l = channel.snippet) === null || _l === void 0 ? void 0 : _l.thumbnails,
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
    var _m, _o, _p, _q, _r, _s;
    try {
        const { user_id, title, description, tags, privacyStatus, videoURL, thumbnailDataUrl, } = req.body;
        const { iso: publishAtISO, error: scheduleError } = (0, youtube_service_1.resolveYouTubePublishAt)(req.body);
        if (!user_id) {
            return res.status(400).json({
                success: false,
                message: "User id required",
            });
        }
        if (!videoURL && !req.file) {
            return res.status(400).json({
                success: false,
                message: "No video source provided (file or URL)",
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
        let videoStream;
        if (req.file) {
            videoStream = stream_1.Readable.from(req.file.buffer);
        }
        else if (videoURL) {
            const response = yield axios_1.default.get(videoURL, { responseType: "stream" });
            videoStream = response.data;
        }
        else {
            return res.status(400).json({
                success: false,
                message: "No video source provided (file or URL)",
            });
        }
        // Upload video to YouTube
        if (scheduleError) {
            return res.status(400).json({ success: false, message: scheduleError });
        }
        const status = {
            privacyStatus: privacyStatus || "public",
        };
        if (publishAtISO) {
            // Scheduled publishing requires initial privacyStatus to be private
            status.privacyStatus = "private";
            status.publishAt = publishAtISO;
        }
        const uploadResponse = yield youtube.videos.insert({
            part: ["snippet", "status"],
            requestBody: {
                snippet: {
                    title: title || "Untitled Video",
                    description: description || "",
                    tags: typeof tags === "string"
                        ? tags.split(",").map((t) => t.trim())
                        : tags || [],
                },
                status,
            },
            media: {
                body: videoStream,
            },
        });
        const videoId = uploadResponse.data.id;
        let thumbnailResult = null;
        let thumbnailError = null;
        if (videoId &&
            typeof thumbnailDataUrl === "string" &&
            thumbnailDataUrl.startsWith("data:")) {
            try {
                const match = thumbnailDataUrl.match(/^data:(.+);base64,(.+)$/);
                if (!match) {
                    throw new Error("Invalid thumbnailDataUrl format");
                }
                const base64 = match[2];
                const buffer = Buffer.from(base64, "base64");
                thumbnailResult = yield youtube.thumbnails.set({
                    videoId,
                    media: {
                        body: stream_1.Readable.from(buffer),
                    },
                });
            }
            catch (thumbErr) {
                thumbnailError =
                    ((_p = (_o = (_m = thumbErr === null || thumbErr === void 0 ? void 0 : thumbErr.response) === null || _m === void 0 ? void 0 : _m.data) === null || _o === void 0 ? void 0 : _o.error) === null || _p === void 0 ? void 0 : _p.message) ||
                        ((_r = (_q = thumbErr === null || thumbErr === void 0 ? void 0 : thumbErr.errors) === null || _q === void 0 ? void 0 : _q[0]) === null || _r === void 0 ? void 0 : _r.message) ||
                        (thumbErr === null || thumbErr === void 0 ? void 0 : thumbErr.message) ||
                        String(thumbErr);
                console.warn("Failed to set YouTube thumbnail:", thumbnailError);
            }
        }
        if (publishAtISO) {
            // Save scheduled video to database
            yield scheduledPost_model_1.default.create({
                user_id,
                platform: "youtube",
                content: title || "Untitled Video",
                media_urls: [videoURL || `https://www.youtube.com/watch?v=${videoId}`],
                media_type: "video",
                scheduled_at: new Date(publishAtISO),
                status: "completed",
                platform_specific_data: {
                    description,
                    tags,
                    videoId,
                    privacyStatus: status.privacyStatus,
                    thumbnailSet: Boolean(thumbnailResult),
                    thumbnailError,
                },
            });
            return res.status(200).json({
                success: true,
                scheduled: true,
                details: {
                    id: videoId,
                    title: title || ((_s = uploadResponse.data.snippet) === null || _s === void 0 ? void 0 : _s.title),
                    scheduledAt: publishAtISO,
                    privacyStatus: status.privacyStatus,
                    videoUrl: `https://www.youtube.com/watch?v=${videoId}`,
                    thumbnailSet: Boolean(thumbnailResult),
                    thumbnailError,
                },
                message: "Video scheduled for publishing",
            });
        }
        // Save posted video to database
        yield postedContent_model_1.default.create({
            user_id,
            platform: "youtube",
            content: title || "Untitled Video",
            media_urls: [videoURL || `https://www.youtube.com/watch?v=${videoId}`],
            posted_at: new Date(),
            platform_post_id: videoId,
            is_scheduled: false,
            status: "published",
            platform_specific_data: {
                description,
                tags,
                privacyStatus: privacyStatus || "public",
                videoUrl: `https://www.youtube.com/watch?v=${videoId}`,
                thumbnailSet: Boolean(thumbnailResult),
                thumbnail: thumbnailResult === null || thumbnailResult === void 0 ? void 0 : thumbnailResult.data,
                thumbnailError,
            },
        });
        return res.status(200).json({
            success: true,
            message: "Video uploaded successfully",
            videoId,
            videoUrl: `https://www.youtube.com/watch?v=${videoId}`,
            thumbnailSet: Boolean(thumbnailResult),
            thumbnailError,
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
const getAllYoutubeVideos = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _t, _u, _v, _w, _x, _y, _z, _0, _1, _2, _3, _4, _5, _6, _7, _8, _9, _10, _11, _12, _13, _14, _15, _16, _17, _18, _19, _20, _21, _22, _23, _24, _25, _26, _27;
    try {
        const userId = ((_t = req.body) === null || _t === void 0 ? void 0 : _t.userId) ||
            ((_u = req.body) === null || _u === void 0 ? void 0 : _u.user_id) ||
            ((_v = req.query) === null || _v === void 0 ? void 0 : _v.userId) ||
            ((_w = req.query) === null || _w === void 0 ? void 0 : _w.user_id);
        console.log("User id ", userId);
        const asBool = (v) => v === true || v === 1 || v === "1" || String(v).toLowerCase() === "true";
        const limitRaw = Number(req.query.limit);
        const limit = Number.isFinite(limitRaw) && limitRaw > 0
            ? Math.min(Math.floor(limitRaw), 50)
            : 50;
        const pageToken = typeof req.query.pageToken === "string"
            ? req.query.pageToken
            : typeof req.query.page_token === "string"
                ? req.query.page_token
                : undefined;
        const allMode = asBool(req.query.all);
        if (!userId) {
            return res.status(400).json({
                success: false,
                message: "User id required",
            });
        }
        const user = yield users_model_1.default.findById(userId);
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
        oauth2Client.setCredentials({
            refresh_token: user.youtube.access_token,
        });
        const accessTokenResponse = yield oauth2Client.getAccessToken();
        oauth2Client.setCredentials({
            access_token: (accessTokenResponse === null || accessTokenResponse === void 0 ? void 0 : accessTokenResponse.token) || user.youtube.access_token,
            refresh_token: user.youtube.access_token,
        });
        const youtube = googleapis_1.google.youtube({ version: "v3", auth: oauth2Client });
        const channelResp = yield youtube.channels.list({
            part: ["contentDetails"],
            mine: true,
        });
        if (!channelResp.data.items || channelResp.data.items.length === 0) {
            return res.status(404).json({
                success: false,
                message: "No channel found",
            });
        }
        const uploadsPlaylistId = (_y = (_x = channelResp.data.items[0].contentDetails) === null || _x === void 0 ? void 0 : _x.relatedPlaylists) === null || _y === void 0 ? void 0 : _y.uploads;
        if (!uploadsPlaylistId) {
            return res.status(404).json({
                success: false,
                message: "Uploads playlist not found",
            });
        }
        const allVideos = [];
        let nextPageToken = null;
        let prevPageToken = null;
        if (allMode) {
            let cursor = undefined;
            do {
                const resp = yield youtube.playlistItems.list({
                    part: ["snippet", "contentDetails"],
                    playlistId: uploadsPlaylistId,
                    maxResults: 50,
                    pageToken: cursor,
                });
                const data = resp.data;
                const items = data.items || [];
                for (const item of items) {
                    allVideos.push({
                        id: ((_z = item.contentDetails) === null || _z === void 0 ? void 0 : _z.videoId) || null,
                        title: ((_0 = item.snippet) === null || _0 === void 0 ? void 0 : _0.title) || null,
                        description: ((_1 = item.snippet) === null || _1 === void 0 ? void 0 : _1.description) || null,
                        publishedAt: ((_2 = item.contentDetails) === null || _2 === void 0 ? void 0 : _2.videoPublishedAt) ||
                            ((_3 = item.snippet) === null || _3 === void 0 ? void 0 : _3.publishedAt) ||
                            null,
                        thumbnails: (_4 = item.snippet) === null || _4 === void 0 ? void 0 : _4.thumbnails,
                        channelId: ((_5 = item.snippet) === null || _5 === void 0 ? void 0 : _5.channelId) || null,
                        statistics: null,
                        duration: null,
                        privacyStatus: null,
                        tags: null,
                        url: ((_6 = item.contentDetails) === null || _6 === void 0 ? void 0 : _6.videoId)
                            ? `https://www.youtube.com/watch?v=${item.contentDetails.videoId}`
                            : null,
                        channelTitle: ((_7 = item.snippet) === null || _7 === void 0 ? void 0 : _7.channelTitle) || null,
                        categoryId: null,
                        liveBroadcastContent: null,
                        madeForKids: null,
                        licensedContent: null,
                        topicCategories: null,
                    });
                }
                cursor = data.nextPageToken || undefined;
            } while (cursor);
        }
        else {
            const resp = yield youtube.playlistItems.list({
                part: ["snippet", "contentDetails"],
                playlistId: uploadsPlaylistId,
                maxResults: limit,
                pageToken,
            });
            const data = resp.data;
            nextPageToken = data.nextPageToken || null;
            prevPageToken = data.prevPageToken || null;
            const items = data.items || [];
            for (const item of items) {
                allVideos.push({
                    id: ((_8 = item.contentDetails) === null || _8 === void 0 ? void 0 : _8.videoId) || null,
                    title: ((_9 = item.snippet) === null || _9 === void 0 ? void 0 : _9.title) || null,
                    description: ((_10 = item.snippet) === null || _10 === void 0 ? void 0 : _10.description) || null,
                    publishedAt: ((_11 = item.contentDetails) === null || _11 === void 0 ? void 0 : _11.videoPublishedAt) ||
                        ((_12 = item.snippet) === null || _12 === void 0 ? void 0 : _12.publishedAt) ||
                        null,
                    thumbnails: (_13 = item.snippet) === null || _13 === void 0 ? void 0 : _13.thumbnails,
                    channelId: ((_14 = item.snippet) === null || _14 === void 0 ? void 0 : _14.channelId) || null,
                    statistics: null,
                    duration: null,
                    privacyStatus: null,
                    tags: null,
                    url: ((_15 = item.contentDetails) === null || _15 === void 0 ? void 0 : _15.videoId)
                        ? `https://www.youtube.com/watch?v=${item.contentDetails.videoId}`
                        : null,
                    channelTitle: ((_16 = item.snippet) === null || _16 === void 0 ? void 0 : _16.channelTitle) || null,
                    categoryId: null,
                    liveBroadcastContent: null,
                    madeForKids: null,
                    licensedContent: null,
                    topicCategories: null,
                });
            }
        }
        // Enrich with video details: statistics, contentDetails, status, extra snippet fields
        const videoIds = allVideos
            .map((v) => v.id)
            .filter((id) => !!id);
        const chunk = (arr, size) => {
            const out = [];
            for (let i = 0; i < arr.length; i += size)
                out.push(arr.slice(i, i + size));
            return out;
        };
        const idChunks = chunk(videoIds, 50);
        const detailsMap = {};
        for (const ids of idChunks) {
            const detailsResp = yield youtube.videos.list({
                part: [
                    "snippet",
                    "statistics",
                    "contentDetails",
                    "status",
                    "topicDetails",
                ],
                id: ids,
            });
            const details = (detailsResp.data.items ||
                []);
            for (const d of details) {
                if (d.id)
                    detailsMap[d.id] = d;
            }
        }
        // Merge back into allVideos
        for (const v of allVideos) {
            const id = v.id || "";
            const d = id ? detailsMap[id] : undefined;
            if (d) {
                v.statistics = d.statistics || null;
                v.duration = ((_17 = d.contentDetails) === null || _17 === void 0 ? void 0 : _17.duration) || null;
                v.privacyStatus = ((_18 = d.status) === null || _18 === void 0 ? void 0 : _18.privacyStatus) || null;
                // Prefer tags from detailed snippet if present
                v.tags = ((_19 = d.snippet) === null || _19 === void 0 ? void 0 : _19.tags) || v.tags || null;
                v.channelTitle =
                    ((_20 = d.snippet) === null || _20 === void 0 ? void 0 : _20.channelTitle) || v.channelTitle || null;
                v.categoryId = ((_21 = d.snippet) === null || _21 === void 0 ? void 0 : _21.categoryId) || null;
                v.liveBroadcastContent =
                    ((_22 = d.snippet) === null || _22 === void 0 ? void 0 : _22.liveBroadcastContent) ||
                        v.liveBroadcastContent ||
                        null;
                v.madeForKids = (_24 = (_23 = d.status) === null || _23 === void 0 ? void 0 : _23.madeForKids) !== null && _24 !== void 0 ? _24 : null;
                v.licensedContent = (_26 = (_25 = d.contentDetails) === null || _25 === void 0 ? void 0 : _25.licensedContent) !== null && _26 !== void 0 ? _26 : null;
                v.topicCategories =
                    ((_27 = d === null || d === void 0 ? void 0 : d.topicDetails) === null || _27 === void 0 ? void 0 : _27.topicCategories) ||
                        null;
            }
        }
        return res.status(200).json({
            success: true,
            result: allVideos,
            pagination: allMode
                ? {
                    mode: "all",
                    total: allVideos.length,
                }
                : {
                    mode: "cursor",
                    limit,
                    nextPageToken,
                    prevPageToken,
                },
        });
    }
    catch (error) {
        console.error("Error fetching videos:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to fetch videos",
            error: error.message,
        });
    }
});
exports.getAllYoutubeVideos = getAllYoutubeVideos;
const getVideoComments = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _28, _29, _30, _31, _32, _33, _34, _35;
    try {
        const { user_id, videoId } = req.body;
        if (!user_id || !videoId) {
            return res.status(400).json({
                success: false,
                message: "user_id and videoId required",
            });
        }
        const user = yield users_model_1.default.findById(user_id);
        if (!user) {
            return res
                .status(401)
                .json({ success: false, message: "User not found" });
        }
        if (!user.youtube || !user.youtube.access_token) {
            return res.status(400).json({
                success: false,
                message: "User does not have a valid YouTube access token",
            });
        }
        oauth2Client.setCredentials({ refresh_token: user.youtube.access_token });
        const accessTokenResponse = yield oauth2Client.getAccessToken();
        oauth2Client.setCredentials({
            access_token: (accessTokenResponse === null || accessTokenResponse === void 0 ? void 0 : accessTokenResponse.token) || user.youtube.access_token,
            refresh_token: user.youtube.access_token,
        });
        const youtube = googleapis_1.google.youtube({ version: "v3", auth: oauth2Client });
        const allComments = [];
        let pageToken = undefined;
        do {
            const resp = yield youtube.commentThreads.list({
                part: ["snippet", "replies"],
                videoId,
                maxResults: 50,
                pageToken,
            });
            const data = resp.data;
            for (const thread of data.items || []) {
                const top = (_29 = (_28 = thread.snippet) === null || _28 === void 0 ? void 0 : _28.topLevelComment) === null || _29 === void 0 ? void 0 : _29.snippet;
                const replies = (((_30 = thread.replies) === null || _30 === void 0 ? void 0 : _30.comments) ||
                    []);
                allComments.push({
                    id: ((_32 = (_31 = thread.snippet) === null || _31 === void 0 ? void 0 : _31.topLevelComment) === null || _32 === void 0 ? void 0 : _32.id) || null,
                    text: (top === null || top === void 0 ? void 0 : top.textDisplay) || null,
                    author: (top === null || top === void 0 ? void 0 : top.authorDisplayName) || null,
                    publishedAt: (top === null || top === void 0 ? void 0 : top.publishedAt) || null,
                    updatedAt: (top === null || top === void 0 ? void 0 : top.updatedAt) || null,
                    likeCount: (_33 = top === null || top === void 0 ? void 0 : top.likeCount) !== null && _33 !== void 0 ? _33 : null,
                    totalReplyCount: (_35 = (_34 = thread.snippet) === null || _34 === void 0 ? void 0 : _34.totalReplyCount) !== null && _35 !== void 0 ? _35 : null,
                    replies: replies.map((r) => {
                        var _a, _b, _c, _d, _e, _f;
                        return ({
                            id: r.id || null,
                            text: ((_a = r.snippet) === null || _a === void 0 ? void 0 : _a.textDisplay) || null,
                            author: ((_b = r.snippet) === null || _b === void 0 ? void 0 : _b.authorDisplayName) || null,
                            publishedAt: ((_c = r.snippet) === null || _c === void 0 ? void 0 : _c.publishedAt) || null,
                            updatedAt: ((_d = r.snippet) === null || _d === void 0 ? void 0 : _d.updatedAt) || null,
                            likeCount: (_f = (_e = r.snippet) === null || _e === void 0 ? void 0 : _e.likeCount) !== null && _f !== void 0 ? _f : null,
                        });
                    }),
                });
            }
            pageToken = data.nextPageToken || undefined;
        } while (pageToken);
        return res.status(200).json({ success: true, result: allComments });
    }
    catch (error) {
        console.error("Error fetching comments:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to fetch comments",
            error: error.message,
        });
    }
});
exports.getVideoComments = getVideoComments;
const addVideoComment = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _36, _37, _38, _39, _40;
    try {
        const { user_id, videoId, text } = req.body;
        if (!user_id || !videoId || !text) {
            return res.status(400).json({
                success: false,
                message: "user_id, videoId and text required",
            });
        }
        const user = yield users_model_1.default.findById(user_id);
        if (!user)
            return res
                .status(401)
                .json({ success: false, message: "User not found" });
        if (!user.youtube || !user.youtube.access_token) {
            return res
                .status(400)
                .json({ success: false, message: "Invalid YouTube token" });
        }
        oauth2Client.setCredentials({ refresh_token: user.youtube.access_token });
        const accessTokenResponse = yield oauth2Client.getAccessToken();
        oauth2Client.setCredentials({
            access_token: (accessTokenResponse === null || accessTokenResponse === void 0 ? void 0 : accessTokenResponse.token) || user.youtube.access_token,
            refresh_token: user.youtube.access_token,
        });
        const youtube = googleapis_1.google.youtube({ version: "v3", auth: oauth2Client });
        const { data } = yield youtube.commentThreads.insert({
            part: ["snippet"],
            requestBody: {
                snippet: {
                    videoId,
                    topLevelComment: {
                        snippet: { textOriginal: text },
                    },
                },
            },
        });
        return res.status(200).json({
            success: true,
            result: {
                id: (_37 = (_36 = data.snippet) === null || _36 === void 0 ? void 0 : _36.topLevelComment) === null || _37 === void 0 ? void 0 : _37.id,
                text: (_40 = (_39 = (_38 = data.snippet) === null || _38 === void 0 ? void 0 : _38.topLevelComment) === null || _39 === void 0 ? void 0 : _39.snippet) === null || _40 === void 0 ? void 0 : _40.textDisplay,
            },
        });
    }
    catch (error) {
        console.error("Error adding comment:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to add comment",
            error: error.message,
        });
    }
});
exports.addVideoComment = addVideoComment;
const replyToYoutubeComment = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _41;
    try {
        const { user_id, parentCommentId, text } = req.body;
        if (!user_id || !parentCommentId || !text) {
            return res.status(400).json({
                success: false,
                message: "user_id, parentCommentId and text required",
            });
        }
        const user = yield users_model_1.default.findById(user_id);
        if (!user)
            return res
                .status(401)
                .json({ success: false, message: "User not found" });
        if (!user.youtube || !user.youtube.access_token) {
            return res
                .status(400)
                .json({ success: false, message: "Invalid YouTube token" });
        }
        oauth2Client.setCredentials({ refresh_token: user.youtube.access_token });
        const accessTokenResponse = yield oauth2Client.getAccessToken();
        oauth2Client.setCredentials({
            access_token: (accessTokenResponse === null || accessTokenResponse === void 0 ? void 0 : accessTokenResponse.token) || user.youtube.access_token,
            refresh_token: user.youtube.access_token,
        });
        const youtube = googleapis_1.google.youtube({ version: "v3", auth: oauth2Client });
        const { data } = yield youtube.comments.insert({
            part: ["snippet"],
            requestBody: {
                snippet: {
                    parentId: parentCommentId,
                    textOriginal: text,
                },
            },
        });
        return res.status(200).json({
            success: true,
            result: { id: data.id, text: (_41 = data.snippet) === null || _41 === void 0 ? void 0 : _41.textDisplay },
        });
    }
    catch (error) {
        console.error("Error replying to comment:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to reply to comment",
            error: error.message,
        });
    }
});
exports.replyToYoutubeComment = replyToYoutubeComment;
const getSubscribers = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _42, _43, _44, _45;
    try {
        const { user_id } = req.body;
        if (!user_id)
            return res
                .status(400)
                .json({ success: false, message: "User id required" });
        const user = yield users_model_1.default.findById(user_id);
        if (!user)
            return res
                .status(401)
                .json({ success: false, message: "User not found" });
        if (!user.youtube || !user.youtube.access_token) {
            return res
                .status(400)
                .json({ success: false, message: "Invalid YouTube token" });
        }
        oauth2Client.setCredentials({ refresh_token: user.youtube.access_token });
        const accessTokenResponse = yield oauth2Client.getAccessToken();
        oauth2Client.setCredentials({
            access_token: (accessTokenResponse === null || accessTokenResponse === void 0 ? void 0 : accessTokenResponse.token) || user.youtube.access_token,
            refresh_token: user.youtube.access_token,
        });
        const youtube = googleapis_1.google.youtube({ version: "v3", auth: oauth2Client });
        const subscribers = [];
        let pageToken = undefined;
        do {
            const resp = yield youtube.subscriptions.list({
                part: ["snippet", "subscriberSnippet"],
                mySubscribers: true,
                maxResults: 50,
                pageToken,
            });
            const data = resp.data;
            for (const item of data.items || []) {
                subscribers.push({
                    channelId: ((_42 = item.subscriberSnippet) === null || _42 === void 0 ? void 0 : _42.channelId) || null,
                    title: ((_43 = item.subscriberSnippet) === null || _43 === void 0 ? void 0 : _43.title) || null,
                    thumbnails: (_44 = item.subscriberSnippet) === null || _44 === void 0 ? void 0 : _44.thumbnails,
                    subscribedAt: ((_45 = item.snippet) === null || _45 === void 0 ? void 0 : _45.publishedAt) || null,
                });
            }
            pageToken = data.nextPageToken || undefined;
        } while (pageToken);
        return res.status(200).json({ success: true, result: subscribers });
    }
    catch (error) {
        console.error("Error fetching subscribers:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to fetch subscribers",
            error: error.message,
        });
    }
});
exports.getSubscribers = getSubscribers;
const getRecentSubscribers = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _46, _47, _48, _49;
    try {
        const { user_id } = req.body;
        if (!user_id)
            return res
                .status(400)
                .json({ success: false, message: "User id required" });
        const user = yield users_model_1.default.findById(user_id);
        if (!user)
            return res
                .status(401)
                .json({ success: false, message: "User not found" });
        if (!user.youtube || !user.youtube.access_token) {
            return res
                .status(400)
                .json({ success: false, message: "Invalid YouTube token" });
        }
        oauth2Client.setCredentials({ refresh_token: user.youtube.access_token });
        const accessTokenResponse = yield oauth2Client.getAccessToken();
        oauth2Client.setCredentials({
            access_token: (accessTokenResponse === null || accessTokenResponse === void 0 ? void 0 : accessTokenResponse.token) || user.youtube.access_token,
            refresh_token: user.youtube.access_token,
        });
        const youtube = googleapis_1.google.youtube({ version: "v3", auth: oauth2Client });
        const recent = [];
        let pageToken = undefined;
        do {
            const resp = yield youtube.subscriptions.list({
                part: ["snippet", "subscriberSnippet"],
                myRecentSubscribers: true,
                maxResults: 50,
                pageToken,
            });
            const data = resp.data;
            for (const item of data.items || []) {
                recent.push({
                    channelId: ((_46 = item.subscriberSnippet) === null || _46 === void 0 ? void 0 : _46.channelId) || null,
                    title: ((_47 = item.subscriberSnippet) === null || _47 === void 0 ? void 0 : _47.title) || null,
                    thumbnails: (_48 = item.subscriberSnippet) === null || _48 === void 0 ? void 0 : _48.thumbnails,
                    subscribedAt: ((_49 = item.snippet) === null || _49 === void 0 ? void 0 : _49.publishedAt) || null,
                });
            }
            pageToken = data.nextPageToken || undefined;
        } while (pageToken);
        return res.status(200).json({ success: true, result: recent });
    }
    catch (error) {
        console.error("Error fetching recent subscribers:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to fetch recent subscribers",
            error: error.message,
        });
    }
});
exports.getRecentSubscribers = getRecentSubscribers;
const getUserSubscriptions = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _50, _51, _52, _53;
    try {
        const { user_id } = req.body;
        if (!user_id)
            return res
                .status(400)
                .json({ success: false, message: "User id required" });
        const user = yield users_model_1.default.findById(user_id);
        if (!user)
            return res
                .status(401)
                .json({ success: false, message: "User not found" });
        if (!user.youtube || !user.youtube.access_token) {
            return res
                .status(400)
                .json({ success: false, message: "Invalid YouTube token" });
        }
        oauth2Client.setCredentials({ refresh_token: user.youtube.access_token });
        const accessTokenResponse = yield oauth2Client.getAccessToken();
        oauth2Client.setCredentials({
            access_token: (accessTokenResponse === null || accessTokenResponse === void 0 ? void 0 : accessTokenResponse.token) || user.youtube.access_token,
            refresh_token: user.youtube.access_token,
        });
        const youtube = googleapis_1.google.youtube({ version: "v3", auth: oauth2Client });
        const subs = [];
        let pageToken = undefined;
        do {
            const resp = yield youtube.subscriptions.list({
                part: ["snippet"],
                mine: true,
                maxResults: 50,
                pageToken,
            });
            const data = resp.data;
            for (const item of data.items || []) {
                const resourceId = (_50 = item.snippet) === null || _50 === void 0 ? void 0 : _50.resourceId;
                subs.push({
                    subscribedChannelId: (resourceId === null || resourceId === void 0 ? void 0 : resourceId.channelId) || null,
                    title: ((_51 = item.snippet) === null || _51 === void 0 ? void 0 : _51.title) || null,
                    thumbnails: (_52 = item.snippet) === null || _52 === void 0 ? void 0 : _52.thumbnails,
                    subscribedAt: ((_53 = item.snippet) === null || _53 === void 0 ? void 0 : _53.publishedAt) || null,
                });
            }
            pageToken = data.nextPageToken || undefined;
        } while (pageToken);
        return res.status(200).json({ success: true, result: subs });
    }
    catch (error) {
        console.error("Error fetching subscriptions:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to fetch subscriptions",
            error: error.message,
        });
    }
});
exports.getUserSubscriptions = getUserSubscriptions;
const getVideoStatistics = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _54;
    try {
        const { user_id, videoId } = req.body;
        if (!user_id || !videoId)
            return res
                .status(400)
                .json({ success: false, message: "user_id and videoId required" });
        const user = yield users_model_1.default.findById(user_id);
        if (!user)
            return res
                .status(401)
                .json({ success: false, message: "User not found" });
        if (!user.youtube || !user.youtube.access_token) {
            return res
                .status(400)
                .json({ success: false, message: "Invalid YouTube token" });
        }
        oauth2Client.setCredentials({ refresh_token: user.youtube.access_token });
        const accessTokenResponse = yield oauth2Client.getAccessToken();
        oauth2Client.setCredentials({
            access_token: (accessTokenResponse === null || accessTokenResponse === void 0 ? void 0 : accessTokenResponse.token) || user.youtube.access_token,
            refresh_token: user.youtube.access_token,
        });
        const youtube = googleapis_1.google.youtube({ version: "v3", auth: oauth2Client });
        const { data } = yield youtube.videos.list({
            part: ["statistics"],
            id: [videoId],
        });
        const stats = data.items && ((_54 = data.items[0]) === null || _54 === void 0 ? void 0 : _54.statistics);
        if (!stats)
            return res
                .status(404)
                .json({ success: false, message: "Video not found" });
        return res.status(200).json({ success: true, result: stats });
    }
    catch (error) {
        console.error("Error fetching video statistics:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to fetch video statistics",
            error: error.message,
        });
    }
});
exports.getVideoStatistics = getVideoStatistics;
const getSingleVideoAnalytics = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _55, _56, _57, _58;
    try {
        const { videoId, dateRange, customRange } = req.body;
        const userId = ((_55 = req.body) === null || _55 === void 0 ? void 0 : _55.userId) ||
            ((_56 = req.body) === null || _56 === void 0 ? void 0 : _56.user_id) ||
            ((_57 = req.query) === null || _57 === void 0 ? void 0 : _57.userId) ||
            ((_58 = req.query) === null || _58 === void 0 ? void 0 : _58.user_id);
        if (!userId || !videoId) {
            return res.status(400).json({
                success: false,
                message: "userId and videoId required",
            });
        }
        const user = yield users_model_1.default.findById(userId);
        if (!user) {
            return res
                .status(401)
                .json({ success: false, message: "User not found" });
        }
        if (!user.youtube || !user.youtube.access_token) {
            return res
                .status(400)
                .json({ success: false, message: "Invalid YouTube token" });
        }
        const { youtube, analytics } = yield (0, youtube_service_1.getAuthorizedClient)(user.youtube.access_token);
        const result = yield (0, videoAnalytics_service_1.fetchSingleVideoAnalytics)({
            youtube,
            analytics,
            videoId: String(videoId),
            dateRange: dateRange,
            customRange: customRange,
        });
        return res.status(200).json({ success: true, result });
    }
    catch (error) {
        const status = Number(error === null || error === void 0 ? void 0 : error.statusCode) || 500;
        console.error("Error fetching single video analytics:", error);
        return res.status(status).json({
            success: false,
            message: status === 404
                ? "Video not found"
                : "Failed to fetch single video analytics",
            error: error === null || error === void 0 ? void 0 : error.message,
        });
    }
});
exports.getSingleVideoAnalytics = getSingleVideoAnalytics;
const getChannelStatistics = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _59;
    try {
        const { user_id } = req.query;
        if (!user_id)
            return res
                .status(400)
                .json({ success: false, message: "User id required" });
        const user = yield users_model_1.default.findById(user_id);
        if (!user)
            return res
                .status(401)
                .json({ success: false, message: "User not found" });
        if (!user.youtube || !user.youtube.access_token) {
            return res
                .status(400)
                .json({ success: false, message: "Invalid YouTube token" });
        }
        oauth2Client.setCredentials({ refresh_token: user.youtube.access_token });
        const accessTokenResponse = yield oauth2Client.getAccessToken();
        oauth2Client.setCredentials({
            access_token: (accessTokenResponse === null || accessTokenResponse === void 0 ? void 0 : accessTokenResponse.token) || user.youtube.access_token,
            refresh_token: user.youtube.access_token,
        });
        const youtube = googleapis_1.google.youtube({ version: "v3", auth: oauth2Client });
        const { data } = yield youtube.channels.list({
            part: ["statistics"],
            mine: true,
        });
        const stats = data.items && ((_59 = data.items[0]) === null || _59 === void 0 ? void 0 : _59.statistics);
        if (!stats)
            return res
                .status(404)
                .json({ success: false, message: "Channel not found" });
        return res.status(200).json({ success: true, result: stats });
    }
    catch (error) {
        console.error("Error fetching channel statistics:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to fetch channel statistics",
            error: error.message,
        });
    }
});
exports.getChannelStatistics = getChannelStatistics;
const getYoutubeAllDetails = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _60, _61, _62, _63, _64, _65, _66, _67, _68, _69, _70, _71, _72, _73, _74, _75, _76, _77, _78, _79, _80, _81, _82, _83, _84, _85, _86, _87, _88, _89, _90, _91, _92, _93, _94, _95, _96, _97, _98, _99, _100, _101, _102, _103, _104, _105, _106, _107, _108, _109, _110, _111, _112, _113, _114, _115, _116, _117, _118, _119, _120, _121, _122, _123, _124, _125, _126, _127, _128;
    try {
        const { user_id } = req.query;
        if (!user_id) {
            return res
                .status(400)
                .json({ success: false, message: "User id required" });
        }
        const user = yield users_model_1.default.findById(user_id);
        if (!user || !((_60 = user.youtube) === null || _60 === void 0 ? void 0 : _60.access_token)) {
            return res
                .status(401)
                .json({ success: false, message: "User or YouTube token not found" });
        }
        const { youtube, analytics } = yield (0, youtube_service_1.getAuthorizedClient)(user.youtube.access_token);
        // 1. Channel info (thin controller)
        const { channelData, channelId, uploadsPlaylistId } = yield (0, channel_1.fetchChannelInfo)(youtube);
        // 2. Dates for Analytics (supports dateRange/customRange; never includes today)
        const q = req.query || {};
        const dateRange = (q.dateRange || q.date_range);
        const customStart = q.customStartDate ||
            q.custom_start_date ||
            q["customRange[startDate]"];
        const customEnd = q.customEndDate ||
            q.custom_end_date ||
            q["customRange[endDate]"];
        const hasExplicitRange = !!dateRange || (customStart != null && customEnd != null);
        const appliedFilter = hasExplicitRange
            ? (0, dates_1.resolveYouTubeAnalyticsWindow)({
                dateRange,
                customRange: customStart && customEnd
                    ? { startDate: String(customStart), endDate: String(customEnd) }
                    : null,
                days: null,
                defaultRange: "LAST_28_DAYS",
            })
            : (() => {
                const daysRaw = Number(q.days);
                if (Number.isFinite(daysRaw) && daysRaw > 0) {
                    const w = (0, dates_1.getCustomWindow)(daysRaw);
                    return {
                        dateRange: "CUSTOM",
                        start: w.start,
                        end: w.end,
                        customRange: { startDate: w.start, endDate: w.end },
                    };
                }
                return (0, dates_1.resolveYouTubeAnalyticsWindow)({
                    dateRange: undefined,
                    customRange: null,
                    days: null,
                    defaultRange: "LAST_28_DAYS",
                });
            })();
        const startDate = appliedFilter.start;
        const endDate = appliedFilter.end;
        const shiftYmd = (ymd, days) => {
            const [yy, mm, dd] = String(ymd)
                .split("-")
                .map((x) => Number(x));
            const d = new Date(Date.UTC(yy, (mm || 1) - 1, dd || 1));
            d.setUTCDate(d.getUTCDate() + days);
            return d.toISOString().split("T")[0];
        };
        // Dashboard windows derived from endDate (yesterday max)
        const todayStr = endDate;
        const last48hStartStr = shiftYmd(endDate, -2);
        const last28dStartStr = shiftYmd(endDate, -28);
        // 3. Parallel fetching of various data points
        // 3. YouTube Data API calls
        const [videosResp, subscriptionsResp, activitiesResp, playlistsResp, commentsResp,] = yield Promise.all([
            uploadsPlaylistId
                ? youtube.playlistItems.list({
                    part: ["snippet", "contentDetails"],
                    playlistId: uploadsPlaylistId,
                    maxResults: 15,
                })
                : Promise.resolve({ data: { items: [] } }),
            youtube.subscriptions.list({
                part: ["snippet", "subscriberSnippet"],
                myRecentSubscribers: true,
                maxResults: 10,
            }),
            youtube.activities.list({
                part: ["snippet", "contentDetails"],
                mine: true,
                maxResults: 10, // More for classification
            }),
            youtube.playlists.list({
                part: ["snippet", "contentDetails", "status"],
                mine: true,
                maxResults: 10,
            }),
            youtube.commentThreads.list({
                part: ["snippet", "replies"],
                allThreadsRelatedToChannelId: channelId,
                maxResults: 10,
            }),
        ]);
        // 4. YouTube Analytics API calls (grouped by domain)
        // Analytics helpers imported statically at top
        const [analyticsReport, growthReport, ageReport, genderReport, overviewReport, trafficSourceReport, deviceTypeReport, topVideosReport, productReport, osReport, subscribedStatusReport, searchTermsReport, externalSitesReport, reachDailyReport, provincesUSReport, provincesCAReport, revenueOverviewReport, revenueByDayReport, revenueByCountryReport, revenueTopVideosReport, retentionDailyReport,] = yield Promise.all([
            (0, geography_1.getTopCountries)(analytics, channelId, startDate, endDate, 5),
            (0, overview_1.getGrowth)(analytics, channelId, startDate, endDate),
            (0, audience_1.getAgeReport)(analytics, channelId, startDate, endDate),
            (0, audience_1.getGenderReport)(analytics, channelId, startDate, endDate),
            (0, overview_1.getOverview)(analytics, channelId, startDate, endDate),
            (0, traffic_1.getTrafficSources)(analytics, channelId, startDate, endDate),
            (0, audience_1.getDeviceTypes)(analytics, channelId, startDate, endDate),
            (0, content_1.getTopVideosWithRetention)(analytics, channelId, startDate, endDate, 10),
            (0, products_1.getProducts)(analytics, channelId, startDate, endDate),
            (0, audience_1.getOperatingSystems)(analytics, channelId, startDate, endDate),
            (0, audience_1.getSubscribedStatus)(analytics, channelId, startDate, endDate),
            (0, traffic_1.getTrafficSourcesDetailSearch)(analytics, channelId, startDate, endDate, 15),
            (0, traffic_1.getTrafficSourcesDetailExternal)(analytics, channelId, startDate, endDate, 15),
            (0, reach_1.getReachDaily)(analytics, channelId, startDate, endDate),
            (0, geography_1.getProvincesUS)(analytics, channelId, startDate, endDate, 10),
            (0, geography_1.getProvincesCAEmpty)(),
            Promise.resolve({ data: { rows: [] } }),
            Promise.resolve({ data: { rows: [] } }),
            Promise.resolve({ data: { rows: [] } }),
            Promise.resolve({ data: { rows: [] } }),
            (0, retention_1.getRetentionDaily)(analytics, channelId, startDate, endDate),
        ]);
        // Dashboard additions (supported identifiers only)
        const [topContent48hReport, overview28dReport, topContent28dReport, subscribedStatus28dReport, trafficSources28dReport,] = yield Promise.all([
            (0, content_1.getTopContent)(analytics, channelId, last48hStartStr, todayStr, 10),
            (0, overview_1.getOverview)(analytics, channelId, last28dStartStr, todayStr),
            (0, content_1.getTopContent)(analytics, channelId, last28dStartStr, todayStr, 10),
            (0, audience_1.getSubscribedStatus)(analytics, channelId, last28dStartStr, todayStr),
            (0, traffic_1.getTrafficSources)(analytics, channelId, last28dStartStr, todayStr),
        ]);
        // Fetch ALL uploads via pagination for accurate counts
        const allUploadItems = yield (0, uploads_1.paginateUploads)(youtube, uploadsPlaylistId || null, videosResp);
        // 4. Video Stats Classification
        const videoIds = (allUploadItems || [])
            .map((v) => { var _a; return (_a = v.contentDetails) === null || _a === void 0 ? void 0 : _a.videoId; })
            .filter((id) => !!id);
        const videoStatsMap = yield (0, videos_1.fetchVideoStatsMap)(youtube, videoIds);
        // Fetch extra metadata for Top Videos from analytics
        const topVideoIds = (((_61 = topVideosReport === null || topVideosReport === void 0 ? void 0 : topVideosReport.data) === null || _61 === void 0 ? void 0 : _61.rows) || [])
            .map((row) => row === null || row === void 0 ? void 0 : row[0])
            .filter((id) => typeof id === "string" && !!id);
        const topVideoStatsMap = yield (0, videos_1.fetchMetaForVideos)(youtube, topVideoIds);
        // Classification counts: derive Shorts vs Videos using duration from videoStatsMap
        let shortsCount = 0;
        let videosCount = 0;
        let liveCount = 0;
        // Keep live count from activities
        (activitiesResp.data.items || []).forEach((act) => {
            var _a;
            if (((_a = act.snippet) === null || _a === void 0 ? void 0 : _a.type) === "liveStream")
                liveCount++;
        });
        // isoToSeconds imported statically at top
        Object.values(videoStatsMap).forEach((v) => {
            var _a;
            const sec = (0, iso_1.isoToSeconds)((_a = v === null || v === void 0 ? void 0 : v.contentDetails) === null || _a === void 0 ? void 0 : _a.duration);
            if (sec > 0) {
                if (sec < 60)
                    shortsCount++;
                else
                    videosCount++;
            }
        });
        // Build Post Schedule from videos that have a future status.publishAt
        const postSchedule = Object.values(videoStatsMap)
            .filter((v) => {
            var _a;
            const publishAt = (_a = v.status) === null || _a === void 0 ? void 0 : _a.publishAt;
            return publishAt && new Date(publishAt).getTime() > Date.now();
        })
            .map((v) => {
            var _a, _b, _c, _d;
            return ({
                id: v.id,
                title: (_a = v.snippet) === null || _a === void 0 ? void 0 : _a.title,
                scheduledAt: (_b = v.status) === null || _b === void 0 ? void 0 : _b.publishAt,
                privacyStatus: (_c = v.status) === null || _c === void 0 ? void 0 : _c.privacyStatus,
                thumbnails: (_d = v.snippet) === null || _d === void 0 ? void 0 : _d.thumbnails,
            });
        })
            .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime());
        const result = {
            appliedFilter,
            channel: {
                id: channelId,
                title: (_62 = channelData.snippet) === null || _62 === void 0 ? void 0 : _62.title,
                handle: (_63 = channelData.snippet) === null || _63 === void 0 ? void 0 : _63.customUrl,
                description: (_64 = channelData.snippet) === null || _64 === void 0 ? void 0 : _64.description,
                thumbnails: (_65 = channelData.snippet) === null || _65 === void 0 ? void 0 : _65.thumbnails,
                statistics: channelData.statistics,
                branding: channelData.brandingSettings,
            },
            demographics: {
                topLocations: ((_67 = (_66 = analyticsReport === null || analyticsReport === void 0 ? void 0 : analyticsReport.data) === null || _66 === void 0 ? void 0 : _66.rows) === null || _67 === void 0 ? void 0 : _67.map((row) => ({
                    country: row[0],
                    views: row[1],
                }))) || [],
                ageRange: ((_69 = (_68 = ageReport === null || ageReport === void 0 ? void 0 : ageReport.data) === null || _68 === void 0 ? void 0 : _68.rows) === null || _69 === void 0 ? void 0 : _69.map((row) => ({
                    ageGroup: row[0],
                    views: row[1],
                }))) || [],
                gender: ((_71 = (_70 = genderReport === null || genderReport === void 0 ? void 0 : genderReport.data) === null || _70 === void 0 ? void 0 : _70.rows) === null || _71 === void 0 ? void 0 : _71.map((row) => ({
                    gender: row[0],
                    views: row[1],
                }))) || [],
            },
            postActivity: {
                shorts: shortsCount,
                videos: videosCount,
                lives: liveCount,
                growthTrend: ((_73 = (_72 = growthReport === null || growthReport === void 0 ? void 0 : growthReport.data) === null || _72 === void 0 ? void 0 : _72.rows) === null || _73 === void 0 ? void 0 : _73.map((row) => ({
                    date: row[0],
                    views: row[1],
                    subscribersGained: row[2],
                }))) || [],
            },
            recentVideos: (allUploadItems || []).map((item) => {
                var _a, _b, _c, _d, _e, _f, _g;
                const vId = (_a = item.contentDetails) === null || _a === void 0 ? void 0 : _a.videoId;
                const stats = videoStatsMap[vId] || {};
                return {
                    id: vId,
                    title: (_b = item.snippet) === null || _b === void 0 ? void 0 : _b.title,
                    publishedAt: ((_c = item.contentDetails) === null || _c === void 0 ? void 0 : _c.videoPublishedAt) || ((_d = item.snippet) === null || _d === void 0 ? void 0 : _d.publishedAt),
                    thumbnails: (_e = item.snippet) === null || _e === void 0 ? void 0 : _e.thumbnails,
                    statistics: stats.statistics,
                    duration: (_f = stats.contentDetails) === null || _f === void 0 ? void 0 : _f.duration,
                    privacyStatus: (_g = stats.status) === null || _g === void 0 ? void 0 : _g.privacyStatus,
                };
            }),
            recentSubscribers: (subscriptionsResp.data.items || []).map((item) => {
                var _a, _b, _c, _d;
                return ({
                    channelId: (_a = item.subscriberSnippet) === null || _a === void 0 ? void 0 : _a.channelId,
                    title: (_b = item.subscriberSnippet) === null || _b === void 0 ? void 0 : _b.title,
                    thumbnails: (_c = item.subscriberSnippet) === null || _c === void 0 ? void 0 : _c.thumbnails,
                    subscribedAt: (_d = item.snippet) === null || _d === void 0 ? void 0 : _d.publishedAt,
                });
            }),
            recentComments: (commentsResp.data.items || []).map((thread) => {
                var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p;
                return ({
                    id: thread.id,
                    videoId: (_a = thread.snippet) === null || _a === void 0 ? void 0 : _a.videoId,
                    text: (_d = (_c = (_b = thread.snippet) === null || _b === void 0 ? void 0 : _b.topLevelComment) === null || _c === void 0 ? void 0 : _c.snippet) === null || _d === void 0 ? void 0 : _d.textDisplay,
                    author: (_g = (_f = (_e = thread.snippet) === null || _e === void 0 ? void 0 : _e.topLevelComment) === null || _f === void 0 ? void 0 : _f.snippet) === null || _g === void 0 ? void 0 : _g.authorDisplayName,
                    authorProfileImageUrl: (_k = (_j = (_h = thread.snippet) === null || _h === void 0 ? void 0 : _h.topLevelComment) === null || _j === void 0 ? void 0 : _j.snippet) === null || _k === void 0 ? void 0 : _k.authorProfileImageUrl,
                    publishedAt: (_o = (_m = (_l = thread.snippet) === null || _l === void 0 ? void 0 : _l.topLevelComment) === null || _m === void 0 ? void 0 : _m.snippet) === null || _o === void 0 ? void 0 : _o.publishedAt,
                    replyCount: (_p = thread.snippet) === null || _p === void 0 ? void 0 : _p.totalReplyCount,
                });
            }),
            postSchedule,
            analytics: {
                overview: (() => {
                    var _a;
                    const rows = ((_a = overviewReport === null || overviewReport === void 0 ? void 0 : overviewReport.data) === null || _a === void 0 ? void 0 : _a.rows) || [];
                    const totals = rows[0] || [];
                    const [views, minutes, avgViewDuration, avgViewPercentage, subsGained, subsLost,] = totals;
                    return {
                        views: Number(views || 0),
                        watchTimeMinutes: Number(minutes || 0),
                        averageViewDuration: Number(avgViewDuration || 0),
                        averageViewPercentage: Number(avgViewPercentage || 0),
                        impressions: 0,
                        impressionsCtr: 0,
                        subscribersGained: Number(subsGained || 0),
                        subscribersLost: Number(subsLost || 0),
                        netSubscribers: Number((subsGained || 0) - (subsLost || 0)),
                    };
                })(),
                dailyTrend: ((_75 = (_74 = growthReport === null || growthReport === void 0 ? void 0 : growthReport.data) === null || _74 === void 0 ? void 0 : _74.rows) === null || _75 === void 0 ? void 0 : _75.map((row) => ({
                    date: row[0],
                    views: Number(row[1] || 0),
                    subscribersGained: Number(row[2] || 0),
                }))) || [],
                trafficSources: ((_77 = (_76 = trafficSourceReport === null || trafficSourceReport === void 0 ? void 0 : trafficSourceReport.data) === null || _76 === void 0 ? void 0 : _76.rows) === null || _77 === void 0 ? void 0 : _77.map((row) => ({
                    source: row[0],
                    views: Number(row[1] || 0),
                    watchTimeMinutes: Number(row[2] || 0),
                    impressions: 0,
                    impressionsCtr: 0,
                }))) || [],
                devices: ((_79 = (_78 = deviceTypeReport === null || deviceTypeReport === void 0 ? void 0 : deviceTypeReport.data) === null || _78 === void 0 ? void 0 : _78.rows) === null || _79 === void 0 ? void 0 : _79.map((row) => ({
                    deviceType: row[0],
                    views: Number(row[1] || 0),
                    watchTimeMinutes: Number(row[2] || 0),
                }))) || [],
                topVideos: ((_81 = (_80 = topVideosReport === null || topVideosReport === void 0 ? void 0 : topVideosReport.data) === null || _80 === void 0 ? void 0 : _80.rows) === null || _81 === void 0 ? void 0 : _81.map((row) => {
                    var _a, _b, _c, _d, _e;
                    const videoId = row[0];
                    const meta = topVideoStatsMap[videoId] || {};
                    return {
                        videoId,
                        views: Number(row[1] || 0),
                        watchTimeMinutes: Number(row[2] || 0),
                        averageViewDuration: Number(row[3] || 0),
                        averageViewPercentage: Number(row[4] || 0),
                        title: (_a = meta.snippet) === null || _a === void 0 ? void 0 : _a.title,
                        thumbnails: (_b = meta.snippet) === null || _b === void 0 ? void 0 : _b.thumbnails,
                        duration: (_c = meta.contentDetails) === null || _c === void 0 ? void 0 : _c.duration,
                        privacyStatus: (_d = meta.status) === null || _d === void 0 ? void 0 : _d.privacyStatus,
                        publishedAt: (_e = meta.snippet) === null || _e === void 0 ? void 0 : _e.publishedAt,
                        statistics: meta.statistics,
                        url: videoId
                            ? `https://www.youtube.com/watch?v=${videoId}`
                            : undefined,
                    };
                })) || [],
                products: ((_83 = (_82 = productReport === null || productReport === void 0 ? void 0 : productReport.data) === null || _82 === void 0 ? void 0 : _82.rows) === null || _83 === void 0 ? void 0 : _83.map((row) => ({
                    product: row[0],
                    views: Number(row[1] || 0),
                    watchTimeMinutes: Number(row[2] || 0),
                    impressions: 0,
                    impressionsCtr: 0,
                }))) || [],
                operatingSystems: ((_85 = (_84 = osReport === null || osReport === void 0 ? void 0 : osReport.data) === null || _84 === void 0 ? void 0 : _84.rows) === null || _85 === void 0 ? void 0 : _85.map((row) => ({
                    os: row[0],
                    views: Number(row[1] || 0),
                    watchTimeMinutes: Number(row[2] || 0),
                }))) || [],
                subscribedStatus: ((_87 = (_86 = subscribedStatusReport === null || subscribedStatusReport === void 0 ? void 0 : subscribedStatusReport.data) === null || _86 === void 0 ? void 0 : _86.rows) === null || _87 === void 0 ? void 0 : _87.map((row) => ({
                    status: row[0],
                    views: Number(row[1] || 0),
                    watchTimeMinutes: Number(row[2] || 0),
                }))) || [],
                topSearchTerms: ((_89 = (_88 = searchTermsReport === null || searchTermsReport === void 0 ? void 0 : searchTermsReport.data) === null || _88 === void 0 ? void 0 : _88.rows) === null || _89 === void 0 ? void 0 : _89.map((row) => ({
                    term: row[0],
                    views: Number(row[1] || 0),
                    watchTimeMinutes: Number(row[2] || 0),
                }))) || [],
                topExternalSites: ((_91 = (_90 = externalSitesReport === null || externalSitesReport === void 0 ? void 0 : externalSitesReport.data) === null || _90 === void 0 ? void 0 : _90.rows) === null || _91 === void 0 ? void 0 : _91.map((row) => ({
                    site: row[0],
                    views: Number(row[1] || 0),
                    watchTimeMinutes: Number(row[2] || 0),
                }))) || [],
                // New sections
                reach: {
                    overview: (() => {
                        var _a;
                        const rows = ((_a = overviewReport === null || overviewReport === void 0 ? void 0 : overviewReport.data) === null || _a === void 0 ? void 0 : _a.rows) || [];
                        const totals = rows[0] || [];
                        const [views] = totals;
                        return {
                            impressions: 0,
                            impressionsCtr: 0,
                            views: Number(views || 0),
                        };
                    })(),
                    daily: ((_93 = (_92 = reachDailyReport === null || reachDailyReport === void 0 ? void 0 : reachDailyReport.data) === null || _92 === void 0 ? void 0 : _92.rows) === null || _93 === void 0 ? void 0 : _93.map((row) => ({
                        date: row[0],
                        impressions: 0,
                        impressionsCtr: 0,
                        views: Number(row[1] || 0),
                    }))) || [],
                    bySource: ((_95 = (_94 = trafficSourceReport === null || trafficSourceReport === void 0 ? void 0 : trafficSourceReport.data) === null || _94 === void 0 ? void 0 : _94.rows) === null || _95 === void 0 ? void 0 : _95.map((row) => ({
                        source: row[0],
                        impressions: 0,
                        impressionsCtr: 0,
                        views: Number(row[1] || 0),
                    }))) || [],
                },
                audience: {
                    ageRange: ((_97 = (_96 = ageReport === null || ageReport === void 0 ? void 0 : ageReport.data) === null || _96 === void 0 ? void 0 : _96.rows) === null || _97 === void 0 ? void 0 : _97.map((row) => ({
                        ageGroup: row[0],
                        views: Number(row[1] || 0),
                    }))) || [],
                    gender: ((_99 = (_98 = genderReport === null || genderReport === void 0 ? void 0 : genderReport.data) === null || _98 === void 0 ? void 0 : _98.rows) === null || _99 === void 0 ? void 0 : _99.map((row) => ({
                        gender: row[0],
                        views: Number(row[1] || 0),
                    }))) || [],
                    subscribedStatus: ((_101 = (_100 = subscribedStatusReport === null || subscribedStatusReport === void 0 ? void 0 : subscribedStatusReport.data) === null || _100 === void 0 ? void 0 : _100.rows) === null || _101 === void 0 ? void 0 : _101.map((row) => ({
                        status: row[0],
                        views: Number(row[1] || 0),
                        watchTimeMinutes: Number(row[2] || 0),
                    }))) || [],
                    devices: ((_103 = (_102 = deviceTypeReport === null || deviceTypeReport === void 0 ? void 0 : deviceTypeReport.data) === null || _102 === void 0 ? void 0 : _102.rows) === null || _103 === void 0 ? void 0 : _103.map((row) => ({
                        deviceType: row[0],
                        views: Number(row[1] || 0),
                        watchTimeMinutes: Number(row[2] || 0),
                    }))) || [],
                    operatingSystems: ((_105 = (_104 = osReport === null || osReport === void 0 ? void 0 : osReport.data) === null || _104 === void 0 ? void 0 : _104.rows) === null || _105 === void 0 ? void 0 : _105.map((row) => ({
                        os: row[0],
                        views: Number(row[1] || 0),
                        watchTimeMinutes: Number(row[2] || 0),
                    }))) || [],
                },
                geography: {
                    countries: ((_107 = (_106 = analyticsReport === null || analyticsReport === void 0 ? void 0 : analyticsReport.data) === null || _106 === void 0 ? void 0 : _106.rows) === null || _107 === void 0 ? void 0 : _107.map((row) => ({
                        country: row[0],
                        views: Number(row[1] || 0),
                        watchTimeMinutes: Number(row[2] || 0),
                        averageViewDuration: Number(row[3] || 0),
                    }))) || [],
                    provincesUS: ((_109 = (_108 = provincesUSReport === null || provincesUSReport === void 0 ? void 0 : provincesUSReport.data) === null || _108 === void 0 ? void 0 : _108.rows) === null || _109 === void 0 ? void 0 : _109.map((row) => ({
                        province: row[0],
                        views: Number(row[1] || 0),
                        watchTimeMinutes: Number(row[2] || 0),
                        averageViewDuration: Number(row[3] || 0),
                    }))) || [],
                    provincesCA: ((_111 = (_110 = provincesCAReport === null || provincesCAReport === void 0 ? void 0 : provincesCAReport.data) === null || _110 === void 0 ? void 0 : _110.rows) === null || _111 === void 0 ? void 0 : _111.map((row) => ({
                        province: row[0],
                        views: Number(row[1] || 0),
                        watchTimeMinutes: Number(row[2] || 0),
                        averageViewDuration: Number(row[3] || 0),
                    }))) || [],
                },
                retention: {
                    averages: (() => {
                        var _a;
                        const rows = ((_a = overviewReport === null || overviewReport === void 0 ? void 0 : overviewReport.data) === null || _a === void 0 ? void 0 : _a.rows) || [];
                        const totals = rows[0] || [];
                        const [, , avgViewDuration, avgViewPercentage] = totals;
                        return {
                            averageViewDuration: Number(avgViewDuration || 0),
                            averageViewPercentage: Number(avgViewPercentage || 0),
                        };
                    })(),
                    daily: ((_113 = (_112 = retentionDailyReport === null || retentionDailyReport === void 0 ? void 0 : retentionDailyReport.data) === null || _112 === void 0 ? void 0 : _112.rows) === null || _113 === void 0 ? void 0 : _113.map((row) => ({
                        date: row[0],
                        averageViewDuration: Number(row[1] || 0),
                        averageViewPercentage: Number(row[2] || 0),
                        views: Number(row[3] || 0),
                    }))) || [],
                    topVideos: ((_115 = (_114 = topVideosReport === null || topVideosReport === void 0 ? void 0 : topVideosReport.data) === null || _114 === void 0 ? void 0 : _114.rows) === null || _115 === void 0 ? void 0 : _115.map((row) => ({
                        videoId: row[0],
                        averageViewDuration: Number(row[3] || 0),
                        averageViewPercentage: Number(row[4] || 0),
                    }))) || [],
                },
                revenue: {
                    overview: (() => {
                        var _a;
                        const rows = ((_a = revenueOverviewReport === null || revenueOverviewReport === void 0 ? void 0 : revenueOverviewReport.data) === null || _a === void 0 ? void 0 : _a.rows) || [];
                        const totals = rows[0] || [];
                        const [estimatedRevenue, adImpressions, monetizedPlaybacks, cpm] = totals;
                        return {
                            estimatedRevenue: Number(estimatedRevenue || 0),
                            adImpressions: Number(adImpressions || 0),
                            monetizedPlaybacks: Number(monetizedPlaybacks || 0),
                            playbackBasedCpm: Number(cpm || 0),
                        };
                    })(),
                    byDay: ((_117 = (_116 = revenueByDayReport === null || revenueByDayReport === void 0 ? void 0 : revenueByDayReport.data) === null || _116 === void 0 ? void 0 : _116.rows) === null || _117 === void 0 ? void 0 : _117.map((row) => ({
                        date: row[0],
                        estimatedRevenue: Number(row[1] || 0),
                        adImpressions: Number(row[2] || 0),
                        monetizedPlaybacks: Number(row[3] || 0),
                        playbackBasedCpm: Number(row[4] || 0),
                    }))) || [],
                    byCountry: ((_119 = (_118 = revenueByCountryReport === null || revenueByCountryReport === void 0 ? void 0 : revenueByCountryReport.data) === null || _118 === void 0 ? void 0 : _118.rows) === null || _119 === void 0 ? void 0 : _119.map((row) => ({
                        country: row[0],
                        estimatedRevenue: Number(row[1] || 0),
                    }))) || [],
                    topVideos: ((_121 = (_120 = revenueTopVideosReport === null || revenueTopVideosReport === void 0 ? void 0 : revenueTopVideosReport.data) === null || _120 === void 0 ? void 0 : _120.rows) === null || _121 === void 0 ? void 0 : _121.map((row) => ({
                        videoId: row[0],
                        estimatedRevenue: Number(row[1] || 0),
                        monetizedPlaybacks: Number(row[2] || 0),
                    }))) || [],
                },
            },
        };
        // Build Dashboard sections (frontend-friendly)
        // Note: We only use supported metrics/dimensions; impressions/CTR are unavailable.
        // 1) Top Content (Last 48 Hours)
        const top48Ids = (((_122 = topContent48hReport === null || topContent48hReport === void 0 ? void 0 : topContent48hReport.data) === null || _122 === void 0 ? void 0 : _122.rows) || [])
            .map((r) => r[0])
            .filter((id) => typeof id === "string" && !!id);
        let top48MetaMap = {};
        if (top48Ids.length > 0) {
            const resp = yield youtube.videos.list({
                part: ["snippet", "contentDetails"],
                id: top48Ids,
            });
            (_123 = resp.data.items) === null || _123 === void 0 ? void 0 : _123.forEach((v) => {
                if (v.id)
                    top48MetaMap[v.id] = v;
            });
        }
        const topContent48h = (((_124 = topContent48hReport === null || topContent48hReport === void 0 ? void 0 : topContent48hReport.data) === null || _124 === void 0 ? void 0 : _124.rows) || []).map((row) => {
            var _a, _b, _c;
            const videoId = row[0];
            const meta = top48MetaMap[videoId] || {};
            return {
                videoId,
                views: Number(row[1] || 0),
                watchTimeMinutes: Number(row[2] || 0),
                // Enriched via Data API
                title: (_a = meta.snippet) === null || _a === void 0 ? void 0 : _a.title,
                thumbnails: (_b = meta.snippet) === null || _b === void 0 ? void 0 : _b.thumbnails,
                duration: (_c = meta.contentDetails) === null || _c === void 0 ? void 0 : _c.duration,
            };
        });
        // 2) Overview Tab (Last 28 Days)
        const overview28Rows = (0, rows_1.safeRows)(overview28dReport);
        const [ovViews, ovMinutes, ovSubsG, ovSubsL] = (0, rows_1.firstRow)(overview28dReport);
        const top28Ids = (((_125 = topContent28dReport === null || topContent28dReport === void 0 ? void 0 : topContent28dReport.data) === null || _125 === void 0 ? void 0 : _125.rows) || [])
            .map((r) => r[0])
            .filter((id) => typeof id === "string" && !!id);
        let top28MetaMap = {};
        if (top28Ids.length > 0) {
            const resp = yield youtube.videos.list({
                part: ["snippet", "contentDetails"],
                id: top28Ids,
            });
            (_126 = resp.data.items) === null || _126 === void 0 ? void 0 : _126.forEach((v) => {
                if (v.id)
                    top28MetaMap[v.id] = v;
            });
        }
        const topContent28d = (((_127 = topContent28dReport === null || topContent28dReport === void 0 ? void 0 : topContent28dReport.data) === null || _127 === void 0 ? void 0 : _127.rows) || []).map((row) => {
            var _a, _b, _c;
            const videoId = row[0];
            const meta = top28MetaMap[videoId] || {};
            return {
                videoId,
                views: Number(row[1] || 0),
                watchTimeMinutes: Number(row[2] || 0),
                title: (_a = meta.snippet) === null || _a === void 0 ? void 0 : _a.title,
                thumbnails: (_b = meta.snippet) === null || _b === void 0 ? void 0 : _b.thumbnails,
                duration: (_c = meta.contentDetails) === null || _c === void 0 ? void 0 : _c.duration,
            };
        });
        // 3) Content Tab (published content + viewer type breakdown)
        const last28dStart = new Date(last28dStartStr).getTime();
        const contentPublished = (allUploadItems || [])
            .filter((item) => {
            var _a, _b;
            const publishedAt = ((_a = item.contentDetails) === null || _a === void 0 ? void 0 : _a.videoPublishedAt) || ((_b = item.snippet) === null || _b === void 0 ? void 0 : _b.publishedAt);
            return publishedAt && new Date(publishedAt).getTime() >= last28dStart;
        })
            .map((item) => {
            var _a, _b, _c, _d, _e, _f, _g;
            const vId = (_a = item.contentDetails) === null || _a === void 0 ? void 0 : _a.videoId;
            const stats = videoStatsMap[vId] || {};
            return {
                id: vId,
                title: (_b = item.snippet) === null || _b === void 0 ? void 0 : _b.title,
                thumbnails: (_c = item.snippet) === null || _c === void 0 ? void 0 : _c.thumbnails,
                publishedAt: ((_d = item.contentDetails) === null || _d === void 0 ? void 0 : _d.videoPublishedAt) || ((_e = item.snippet) === null || _e === void 0 ? void 0 : _e.publishedAt),
                duration: (_f = stats.contentDetails) === null || _f === void 0 ? void 0 : _f.duration,
                views: Number(((_g = stats.statistics) === null || _g === void 0 ? void 0 : _g.viewCount) || 0),
            };
        });
        const viewerRows = ((_128 = subscribedStatus28dReport === null || subscribedStatus28dReport === void 0 ? void 0 : subscribedStatus28dReport.data) === null || _128 === void 0 ? void 0 : _128.rows) || [];
        const viewerBreakdown = {
            // Approximation: NOT_SUBSCRIBED as new viewers; SUBSCRIBED as regular viewers
            approximationUsed: true,
            newViewersApprox: {
                views: Number((viewerRows.find((r) => r[0] === "NOT_SUBSCRIBED") || [])[1] ||
                    0),
                watchTimeMinutes: Number((viewerRows.find((r) => r[0] === "NOT_SUBSCRIBED") || [])[2] ||
                    0),
            },
            regularViewersApprox: {
                views: Number((viewerRows.find((r) => r[0] === "SUBSCRIBED") || [])[1] || 0),
                watchTimeMinutes: Number((viewerRows.find((r) => r[0] === "SUBSCRIBED") || [])[2] || 0),
            },
        };
        // 4) Content Performance (Impressions Flow)
        const impressionsFlow = {
            // The YouTube Analytics API v2 does NOT provide impressions or CTR.
            impressionsUnavailable: true,
            impressions: 0,
            ctr: 0,
            watchTimeFromImpressions: 0,
        };
        // 5) Traffic Sources (percentages) - supported identifiers only
        const allowedSources = new Set([
            "YT_SEARCH",
            "BROWSE_FEATURES",
            "SUGGESTED_VIDEO",
            "CHANNEL_PAGES",
            "DIRECT_OR_UNKNOWN",
        ]);
        const tsRows = (0, rows_1.safeRows)(trafficSources28dReport);
        const filteredTS = tsRows.filter((r) => allowedSources.has(r[0]));
        const totalTSViews = filteredTS.reduce((sum, r) => sum + Number(r[1] || 0), 0);
        const trafficSources = filteredTS.map((r) => ({
            source: r[0],
            views: Number(r[1] || 0),
            percentage: totalTSViews > 0 ? (Number(r[1] || 0) / totalTSViews) * 100 : 0,
        }));
        // 6) Audience Tab (28 days proxy)
        const audienceWatchRows = viewerRows;
        const minutesSubscribed = Number((audienceWatchRows.find((r) => r[0] === "SUBSCRIBED") || [])[2] ||
            0);
        const minutesNotSubscribed = Number((audienceWatchRows.find((r) => r[0] === "NOT_SUBSCRIBED") ||
            [])[2] || 0);
        const totalMinutes = minutesSubscribed + minutesNotSubscribed;
        const audience = {
            views: Number(ovViews || 0),
            watchTimeHours: Number(ovMinutes || 0) / 60,
            subscribersNet: Number((ovSubsG || 0) - (ovSubsL || 0)),
            watchTimeSplit: {
                subscribedPercent: totalMinutes > 0 ? (minutesSubscribed / totalMinutes) * 100 : 0,
                notSubscribedPercent: totalMinutes > 0 ? (minutesNotSubscribed / totalMinutes) * 100 : 0,
            },
        };
        // Attach dashboard to result without altering existing structure
        result.dashboard = {
            topContent48h,
            overview28d: {
                totalViews: Number(ovViews || 0),
                totalWatchTimeHours: Number(ovMinutes || 0) / 60,
                subscribersGained: Number(ovSubsG || 0),
                subscribersLost: Number(ovSubsL || 0),
                netSubscribers: Number((ovSubsG || 0) - (ovSubsL || 0)),
                topContent: topContent28d,
            },
            contentTab: {
                views: Number(ovViews || 0),
                publishedContent: contentPublished,
                viewerBreakdown,
            },
            contentPerformance: impressionsFlow,
            trafficSources,
            audience,
        };
        return res.status(200).json({ success: true, result });
    }
    catch (error) {
        const status = Number(error === null || error === void 0 ? void 0 : error.statusCode) || 500;
        console.error("Error fetching all youtube details:", error);
        return res.status(status).json({
            success: false,
            message: "Failed to fetch all youtube details",
            error: error.message,
        });
    }
});
exports.getYoutubeAllDetails = getYoutubeAllDetails;
const deleteYoutubeVideo = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _129;
    try {
        const { user_id, videoId } = req.body;
        if (!user_id || !videoId) {
            return res
                .status(400)
                .json({ success: false, message: "user_id and videoId required" });
        }
        const user = yield users_model_1.default.findById(user_id);
        if (!user || !((_129 = user.youtube) === null || _129 === void 0 ? void 0 : _129.access_token)) {
            return res
                .status(401)
                .json({ success: false, message: "User or YouTube token not found" });
        }
        const { youtube } = yield (0, youtube_service_1.getAuthorizedClient)(user.youtube.access_token);
        yield youtube.videos.delete({ id: videoId });
        return res
            .status(200)
            .json({ success: true, message: "Video deleted successfully" });
    }
    catch (error) {
        console.error("Error deleting video:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to delete video",
            error: error.message,
        });
    }
});
exports.deleteYoutubeVideo = deleteYoutubeVideo;
