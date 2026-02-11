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
exports.disconnectX = exports.getXAllDetails = exports.postXUniversal = exports.getXProfile = exports.xRefreshToken = exports.xAuthCallback = exports.xLogin = void 0;
const axios_1 = __importDefault(require("axios"));
const mongoose_1 = require("mongoose");
const x_service_1 = require("../../../../services/x/x.service");
const users_model_1 = __importDefault(require("../../../../models/users/users.model"));
const postedContent_model_1 = __importDefault(require("../../../../models/postedContent/postedContent.model"));
const uploadFile_1 = require("../../../../services/uploadFile/uploadFile");
const TWITTER_API_BASE = "https://api.twitter.com/2";
const TWITTER_OAUTH_REVOKE = "https://api.twitter.com/2/oauth2/revoke";
const xLogin = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const { user_id } = req.query;
        if (!user_id) {
            return res
                .status(400)
                .json({ success: false, message: "user_id is required" });
        }
        const url = yield (0, x_service_1.getXAuthURL)(user_id);
        return res.redirect(url);
    }
    catch (error) {
        console.error("X login error:", ((_a = error.response) === null || _a === void 0 ? void 0 : _a.data) || error.message);
        return res.status(500).json({
            success: false,
            message: "X login failed",
            error: error.message,
        });
    }
});
exports.xLogin = xLogin;
const xAuthCallback = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _b, _c;
    try {
        const { code, state } = req.query;
        if (!code || !state) {
            return res
                .status(400)
                .json({ success: false, message: "Missing code or state" });
        }
        const userId = Buffer.from(state, "base64").toString("utf-8");
        const tokens = yield (0, x_service_1.exchangeCodeForTokens)(code, userId);
        // Fetch profile (if possible) and update all fields at once
        // let profile: any | undefined;
        // try {
        //   profile = await getXUserProfile(tokens.access_token);
        //   console.log("X profile details ", profile);
        // } catch (profErr) {
        //   console.warn(
        //     "Failed to fetch X profile (will still store tokens):",
        //     profErr,
        //   );
        // }
        // const setFields: Record<string, any> = {
        //   "x.access_token": tokens.access_token,
        // };
        // if (tokens.refresh_token)
        //   setFields["x.refresh_token"] = tokens.refresh_token;
        // if (profile?.id) setFields["x.project_id"] = profile.id;
        // if (profile?.username || profile?.name)
        //   setFields["x.name"] = profile.username || profile.name;
        // try {
        //   await UserModel.findByIdAndUpdate(
        //     userId,
        //     { $set: setFields },
        //     { new: true },
        //   );
        // } catch (updateErr) {
        //   console.warn("Failed to store X data on callback:", updateErr);
        // }
        // const userParam = profile
        //   ? `&user=${encodeURIComponent(JSON.stringify(profile))}`
        //   : "";
        return res.redirect(`${process.env.FRONTEND_URL}/dashboard/social-media?platform=x&token=${tokens.access_token}&user_id=${userId}`);
    }
    catch (error) {
        console.error("X callback error:", ((_b = error.response) === null || _b === void 0 ? void 0 : _b.data) || error.message);
        return res.status(500).json({
            success: false,
            message: "X OAuth callback failed",
            error: ((_c = error.response) === null || _c === void 0 ? void 0 : _c.data) || error.message,
        });
    }
});
exports.xAuthCallback = xAuthCallback;
const xRefreshToken = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _d, _e;
    try {
        const { user_id } = req.query;
        if (!user_id) {
            return res
                .status(400)
                .json({ success: false, message: "user_id is required" });
        }
        const tokens = yield (0, x_service_1.refreshXToken)(user_id);
        return res.status(200).json({ success: true, tokens });
    }
    catch (error) {
        console.error("X refresh error:", ((_d = error.response) === null || _d === void 0 ? void 0 : _d.data) || error.message);
        return res.status(500).json({
            success: false,
            message: "Failed to refresh X token",
            error: ((_e = error.response) === null || _e === void 0 ? void 0 : _e.data) || error.message,
        });
    }
});
exports.xRefreshToken = xRefreshToken;
const getXProfile = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _f, _g, _h, _j, _k, _l, _m, _o, _p, _q;
    try {
        const authHeader = req.headers.authorization || "";
        const { user_id } = req.query;
        // Prefer stored user token when user_id is provided to ensure User Context
        let token = undefined;
        let refreshToken = undefined;
        if (user_id) {
            const user = yield users_model_1.default.findById(user_id);
            token = ((_f = user === null || user === void 0 ? void 0 : user.x) === null || _f === void 0 ? void 0 : _f.access_token) || undefined;
            refreshToken = ((_g = user === null || user === void 0 ? void 0 : user.x) === null || _g === void 0 ? void 0 : _g.refresh_token) || undefined;
        }
        else {
            token = authHeader.startsWith("Bearer ")
                ? authHeader.split("Bearer ")[1]
                : undefined;
        }
        if (!token) {
            return res
                .status(401)
                .json({ success: false, message: "Missing X bearer token" });
        }
        try {
            const profile = yield (0, x_service_1.getXUserProfile)(token);
            return res.status(200).json({ success: true, result: profile });
        }
        catch (err) {
            const status = (_h = err === null || err === void 0 ? void 0 : err.response) === null || _h === void 0 ? void 0 : _h.status;
            const detail = ((_k = (_j = err === null || err === void 0 ? void 0 : err.response) === null || _j === void 0 ? void 0 : _j.data) === null || _k === void 0 ? void 0 : _k.detail) || (err === null || err === void 0 ? void 0 : err.message);
            // If token is expired and we have a refresh, attempt refresh
            if (status === 401 && user_id && refreshToken) {
                try {
                    const tokens = yield (0, x_service_1.refreshXToken)(user_id);
                    const profile = yield (0, x_service_1.getXUserProfile)(tokens.access_token);
                    return res.status(200).json({ success: true, result: profile });
                }
                catch (refreshErr) {
                    return res.status(401).json({
                        success: false,
                        message: "Invalid or expired X token",
                        error: ((_l = refreshErr === null || refreshErr === void 0 ? void 0 : refreshErr.response) === null || _l === void 0 ? void 0 : _l.data) || (refreshErr === null || refreshErr === void 0 ? void 0 : refreshErr.message) || refreshErr,
                    });
                }
            }
            // Unsupported auth typically means Application-Only token was used
            if (status === 403) {
                return res.status(403).json({
                    success: false,
                    message: "Unsupported authentication: use OAuth 2.0 User Context token",
                    error: ((_m = err === null || err === void 0 ? void 0 : err.response) === null || _m === void 0 ? void 0 : _m.data) || detail,
                });
            }
            return res.status(500).json({
                success: false,
                message: "Failed to fetch X profile",
                error: ((_o = err === null || err === void 0 ? void 0 : err.response) === null || _o === void 0 ? void 0 : _o.data) || detail,
            });
        }
    }
    catch (error) {
        console.error("X get profile error:", ((_p = error.response) === null || _p === void 0 ? void 0 : _p.data) || error.message);
        return res.status(500).json({
            success: false,
            message: "Failed to fetch X profile",
            error: ((_q = error.response) === null || _q === void 0 ? void 0 : _q.data) || error.message,
        });
    }
});
exports.getXProfile = getXProfile;
// Universal X post: text, image (URL or file), or video (URL or file)
const postXUniversal = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _r, _s, _t, _u, _v, _w, _x, _y, _z, _0, _1;
    try {
        const { userId, message, imageUrl, videoURL, hashtags } = req.body;
        const uploadedImage = (_s = (_r = req.files) === null || _r === void 0 ? void 0 : _r.image) === null || _s === void 0 ? void 0 : _s[0];
        const uploadedVideo = (_u = (_t = req.files) === null || _t === void 0 ? void 0 : _t.video) === null || _u === void 0 ? void 0 : _u[0];
        if (!userId) {
            return res
                .status(400)
                .json({ success: false, message: "userId is required" });
        }
        // Get user's X access token
        const user = yield users_model_1.default.findById(userId);
        const accessToken = (_v = user === null || user === void 0 ? void 0 : user.x) === null || _v === void 0 ? void 0 : _v.access_token;
        if (!accessToken) {
            return res.status(401).json({
                success: false,
                message: "Unauthorized - Missing X access token",
            });
        }
        // Prepare final media URLs if files uploaded (upload to S3), else use provided URLs
        let finalImageUrl = imageUrl;
        let finalVideoUrl = videoURL;
        if (uploadedImage) {
            const uploadedUrl = yield (0, uploadFile_1.uploadFileToS3Service)(`x_uploads/${userId}`, uploadedImage.buffer, uploadedImage.mimetype || "image/jpeg");
            finalImageUrl = uploadedUrl || undefined;
        }
        if (uploadedVideo) {
            const uploadedUrl = yield (0, uploadFile_1.uploadFileToS3Service)(`x_uploads/${userId}`, uploadedVideo.buffer, uploadedVideo.mimetype || "video/mp4");
            finalVideoUrl = uploadedUrl || undefined;
        }
        // Compose tweet text; media will be shared via URL in text (no media upload here)
        const parts = [];
        if (message)
            parts.push(message);
        if (finalImageUrl)
            parts.push(finalImageUrl);
        if (finalVideoUrl)
            parts.push(finalVideoUrl);
        // Append hashtags if provided
        try {
            let tags = [];
            if (Array.isArray(hashtags)) {
                tags = hashtags;
            }
            else if (typeof hashtags === "string") {
                tags = hashtags.split(/[\s,]+/);
            }
            const formatted = tags
                .map((t) => t.trim())
                .filter(Boolean)
                .map((t) => (t.startsWith("#") ? t.slice(1) : t))
                .map((t) => t.replace(/[^A-Za-z0-9_]/g, ""))
                .filter(Boolean)
                .map((t) => `#${t}`);
            if (formatted.length)
                parts.push(formatted.join(" "));
        }
        catch (_) {
            // ignore hashtag formatting errors
        }
        let text = parts.join(" \n").trim();
        // Optional: enforce tweet length to avoid API errors
        const MAX_TWEET_LENGTH = 280;
        if (text.length > MAX_TWEET_LENGTH) {
            text = text.slice(0, MAX_TWEET_LENGTH);
        }
        if (!text) {
            return res
                .status(400)
                .json({ success: false, message: "No valid content to post" });
        }
        const resp = yield axios_1.default.post(`${TWITTER_API_BASE}/tweets`, { text }, { headers: { Authorization: `Bearer ${accessToken}` } });
        // Save to history
        yield postedContent_model_1.default.create({
            user_id: new mongoose_1.Types.ObjectId(userId),
            platform: "x",
            content: message || text,
            media_urls: [finalImageUrl, finalVideoUrl].filter(Boolean),
            media_type: finalVideoUrl ? "video" : finalImageUrl ? "image" : "text",
            posted_at: new Date(),
            platform_post_id: (_x = (_w = resp.data) === null || _w === void 0 ? void 0 : _w.data) === null || _x === void 0 ? void 0 : _x.id,
            is_scheduled: false,
            status: "published",
            hashtags: Array.isArray(hashtags) ? hashtags : (hashtags === null || hashtags === void 0 ? void 0 : hashtags.split(/[\s,]+/).filter(Boolean)) || [],
        });
        return res.status(200).json({
            success: true,
            tweetId: (_z = (_y = resp.data) === null || _y === void 0 ? void 0 : _y.data) === null || _z === void 0 ? void 0 : _z.id,
            message: "Tweet posted",
        });
    }
    catch (error) {
        console.error("Universal X post error:", ((_0 = error.response) === null || _0 === void 0 ? void 0 : _0.data) || error.message);
        return res.status(500).json({
            success: false,
            message: "Failed to post on X",
            error: ((_1 = error.response) === null || _1 === void 0 ? void 0 : _1.data) || error.message,
        });
    }
});
exports.postXUniversal = postXUniversal;
const getXAllDetails = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _2, _3, _4, _5, _6, _7, _8, _9, _10;
    try {
        // Accept either Authorization header or infer from user_id
        const authHeader = req.headers.authorization || "";
        let bearerToken = authHeader.startsWith("Bearer ")
            ? authHeader.split("Bearer ")[1]
            : undefined;
        const { handle, user_id } = req.query;
        // Try to resolve token and preferred identifiers from DB
        let preferredHandle = handle;
        let preferredUserId = undefined;
        if (user_id) {
            const userDoc = yield users_model_1.default.findById(user_id).exec();
            if (!userDoc) {
                return res
                    .status(404)
                    .json({ success: false, message: "User not found" });
            }
            bearerToken = bearerToken || ((_2 = userDoc.x) === null || _2 === void 0 ? void 0 : _2.access_token) || undefined;
            preferredHandle = preferredHandle || ((_3 = userDoc.x) === null || _3 === void 0 ? void 0 : _3.name) || undefined;
            // "project_id" may store X user id in this app design
            preferredUserId = ((_4 = userDoc.x) === null || _4 === void 0 ? void 0 : _4.project_id) || undefined;
        }
        if (!bearerToken) {
            return res
                .status(401)
                .json({ success: false, message: "Missing X bearer token" });
        }
        const headers = { Authorization: `Bearer ${bearerToken}` };
        // 1) Resolve X user by id or handle or fallback to /users/me
        let xUser;
        if (preferredUserId) {
            const byIdResp = yield axios_1.default
                .get(`${TWITTER_API_BASE}/users/${encodeURIComponent(preferredUserId)}?user.fields=profile_image_url,public_metrics,description,location,created_at,url,verified`, { headers })
                .catch(() => undefined);
            xUser = (_5 = byIdResp === null || byIdResp === void 0 ? void 0 : byIdResp.data) === null || _5 === void 0 ? void 0 : _5.data;
        }
        if (!xUser && preferredHandle) {
            const byHandleResp = yield axios_1.default
                .get(`${TWITTER_API_BASE}/users/by/username/${encodeURIComponent(preferredHandle)}?user.fields=profile_image_url,public_metrics,description,location,created_at,url,verified`, { headers })
                .catch(() => undefined);
            xUser = (_6 = byHandleResp === null || byHandleResp === void 0 ? void 0 : byHandleResp.data) === null || _6 === void 0 ? void 0 : _6.data;
        }
        if (!xUser) {
            // last resort: use authenticated user
            try {
                xUser = yield (0, x_service_1.getXUserProfile)(bearerToken);
            }
            catch (_) {
                // ignore
            }
        }
        if (!(xUser === null || xUser === void 0 ? void 0 : xUser.id)) {
            return res
                .status(404)
                .json({ success: false, message: "X user not found" });
        }
        // 2) Recent tweets with media expansions
        const tweetsResp = yield axios_1.default
            .get(`${TWITTER_API_BASE}/users/${xUser.id}/tweets?max_results=20&tweet.fields=created_at,public_metrics,possibly_sensitive,referenced_tweets,entities,attachments&expansions=attachments.media_keys,author_id,referenced_tweets.id&media.fields=type,url,preview_image_url`, { headers })
            .catch(() => ({ data: { data: [], includes: { media: [] } } }));
        const tweets = tweetsResp.data.data || [];
        const mediaIndex = {};
        const mediaItems = (((_7 = tweetsResp.data.includes) === null || _7 === void 0 ? void 0 : _7.media) || []);
        for (const m of mediaItems) {
            if (m.media_key)
                mediaIndex[m.media_key] = m;
        }
        // Classify posts by content type
        let photos = 0, videos = 0, links = 0, statuses = 0;
        const recentPosts = tweets.map((t) => {
            var _a, _b, _c, _d, _e, _f;
            const hasLinks = !!(((_a = t.entities) === null || _a === void 0 ? void 0 : _a.urls) && t.entities.urls.length > 0);
            const mediaKeys = ((_b = t.attachments) === null || _b === void 0 ? void 0 : _b.media_keys) || [];
            let type = "status";
            if (mediaKeys.length > 0) {
                const first = mediaIndex[mediaKeys[0]];
                if ((first === null || first === void 0 ? void 0 : first.type) === "video")
                    type = "video";
                else
                    type = "photo";
            }
            else if (hasLinks) {
                type = "link";
            }
            if (type === "photo")
                photos++;
            else if (type === "video")
                videos++;
            else if (type === "link")
                links++;
            else
                statuses++;
            return {
                id: t.id,
                message: t.text,
                created_time: t.created_at,
                permalink_url: `https://x.com/${preferredHandle || xUser.username || xUser.name || "user"}/status/${t.id}`,
                full_picture: mediaKeys.length > 0 && ((_c = mediaIndex[mediaKeys[0]]) === null || _c === void 0 ? void 0 : _c.url)
                    ? mediaIndex[mediaKeys[0]].url
                    : undefined,
                type,
                shares: ((_d = t.public_metrics) === null || _d === void 0 ? void 0 : _d.retweet_count) || 0,
                commentsCount: ((_e = t.public_metrics) === null || _e === void 0 ? void 0 : _e.reply_count) || 0,
                likes: ((_f = t.public_metrics) === null || _f === void 0 ? void 0 : _f.like_count) || 0,
            };
        });
        // Growth trend: simple daily tweet activity as a proxy
        const dayMap = {};
        for (const t of tweets) {
            const date = (t.created_at || "").split("T")[0];
            if (!date)
                continue;
            dayMap[date] = (dayMap[date] || 0) + 1;
        }
        const growthTrend = Object.entries(dayMap)
            .map(([date, count]) => ({ date, views: count, postsMade: count }))
            .sort((a, b) => a.date.localeCompare(b.date));
        // Recent comments are not directly available; keep empty
        const recentComments = [];
        // Post schedule not available via public API; keep empty
        const postSchedule = [];
        const result = {
            page: {
                id: xUser.id,
                title: xUser.name,
                handle: preferredHandle || xUser.username || undefined,
                description: xUser.description,
                link: preferredHandle || xUser.username
                    ? `https://x.com/${preferredHandle || xUser.username}`
                    : undefined,
                picture: xUser.profile_image_url,
                fan_count: (_8 = xUser.public_metrics) === null || _8 === void 0 ? void 0 : _8.followers_count,
                cover: undefined,
                category: undefined,
                location: xUser.location,
                verified: xUser.verified,
            },
            demographics: {
                topLocations: [],
                ageRange: [],
                gender: [],
            },
            postActivity: {
                photos,
                videos,
                links,
                statuses,
                growthTrend,
            },
            recentPosts,
            recentComments,
            postSchedule,
        };
        return res.status(200).json({ success: true, result });
    }
    catch (error) {
        console.error("Error fetching X all details:", ((_9 = error.response) === null || _9 === void 0 ? void 0 : _9.data) || error.message);
        return res.status(500).json({
            success: false,
            message: "Failed to fetch X details",
            error: ((_10 = error.response) === null || _10 === void 0 ? void 0 : _10.data) || error.message,
        });
    }
});
exports.getXAllDetails = getXAllDetails;
const disconnectX = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _11, _12, _13, _14, _15, _16, _17, _18;
    try {
        const userId = ((_11 = req.body) === null || _11 === void 0 ? void 0 : _11.userId) ||
            ((_12 = req.body) === null || _12 === void 0 ? void 0 : _12.user_id) ||
            ((_13 = req.query) === null || _13 === void 0 ? void 0 : _13.userId) ||
            ((_14 = req.query) === null || _14 === void 0 ? void 0 : _14.user_id);
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
        const accessToken = ((_15 = user.x) === null || _15 === void 0 ? void 0 : _15.access_token) || undefined;
        const refreshToken = ((_16 = user.x) === null || _16 === void 0 ? void 0 : _16.refresh_token) || undefined;
        const updatedUser = yield users_model_1.default.findByIdAndUpdate(userId, {
            $set: {
                "x.project_id": null,
                "x.name": null,
                "x.access_token": null,
                "x.refresh_token": null,
                "x.pkce_verifier": null,
            },
        }, { new: true }).exec();
        const clientId = process.env.X_CLIENT_ID;
        if (clientId) {
            const headers = { "Content-Type": "application/x-www-form-urlencoded" };
            // Try revoking refresh token first
            if (refreshToken) {
                try {
                    yield axios_1.default.post(TWITTER_OAUTH_REVOKE, new URLSearchParams({
                        token: refreshToken,
                        client_id: clientId,
                        token_type_hint: "refresh_token",
                    }), { headers });
                }
                catch (revErr) {
                    console.warn("Failed to revoke X refresh token:", ((_17 = revErr === null || revErr === void 0 ? void 0 : revErr.response) === null || _17 === void 0 ? void 0 : _17.data) || (revErr === null || revErr === void 0 ? void 0 : revErr.message) || revErr);
                }
            }
            // Then attempt revoking access token
            if (accessToken) {
                try {
                    yield axios_1.default.post(TWITTER_OAUTH_REVOKE, new URLSearchParams({
                        token: accessToken,
                        client_id: clientId,
                        token_type_hint: "access_token",
                    }), { headers });
                }
                catch (revErr) {
                    console.warn("Failed to revoke X access token:", ((_18 = revErr === null || revErr === void 0 ? void 0 : revErr.response) === null || _18 === void 0 ? void 0 : _18.data) || (revErr === null || revErr === void 0 ? void 0 : revErr.message) || revErr);
                }
            }
        }
        else {
            console.warn("X_CLIENT_ID missing; skipping token revocation.");
        }
        return res.status(200).json({
            success: true,
            message: "X disconnected successfully",
            user: updatedUser,
        });
    }
    catch (error) {
        console.error("Error disconnecting X:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to disconnect X",
            error: error.message,
        });
    }
});
exports.disconnectX = disconnectX;
