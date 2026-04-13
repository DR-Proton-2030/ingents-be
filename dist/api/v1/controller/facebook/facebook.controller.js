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
exports.disconnectFacebook = exports.getFacebookAllDetails = exports.postFacebookUniversal = exports.getAccessTokenLongTerm = exports.fetchFacebookPages = exports.facebookAuthCallback = exports.facebookLogin = void 0;
const facebook_service_1 = require("../../../../services/facebook/facebook.service");
const axios_1 = __importDefault(require("axios"));
const uploadFile_1 = require("../../../../services/uploadFile/uploadFile");
const users_model_1 = __importDefault(require("../../../../models/users/users.model"));
const postedContent_model_1 = __importDefault(require("../../../../models/postedContent/postedContent.model"));
const FACEBOOK_GRAPH_URL = "https://graph.facebook.com/v20.0";
const dashboard_builder_1 = require("../../../../services/facebook/dashboard.builder");
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
        const { code, state, granted_scopes, denied_scopes } = req.query;
        console.log("===>called state", state);
        console.log("Facebook callback code and state : ", code, state);
        if (granted_scopes || denied_scopes) {
            console.log("Facebook scopes (granted/denied):", {
                granted_scopes,
                denied_scopes,
            });
        }
        if (!code)
            return res.status(400).json({ error: "No code provided" });
        // Exchange code for access token & user data
        const { tokens, user } = yield (0, facebook_service_1.getFacebookUser)(code);
        console.log("====>state : ", state);
        const rawState = String(state || "");
        const isObjectId = (v) => /^[a-fA-F0-9]{24}$/.test(v);
        // `state` is set to userId (not base64) in getFacebookAuthURL.
        // Accept both raw ObjectId and base64-encoded ObjectId for backward/forward compatibility.
        const decodedState = (() => {
            if (isObjectId(rawState))
                return rawState;
            try {
                const d = atob(rawState);
                return isObjectId(d) ? d : null;
            }
            catch (_a) {
                return null;
            }
        })();
        if (!decodedState) {
            return res.status(400).json({
                error: "Invalid state parameter",
            });
        }
        const userId = decodedState;
        // Redirect to frontend with token & pages as query params
        res.redirect(`${process.env.FRONTEND_URL}/dashboard/social-media?platform=facebook&token=${tokens.access_token}&user=${encodeURIComponent(JSON.stringify(user))}&user_id=${userId}`);
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
    var _a, _b, _c, _d, _e;
    try {
        console.log("fetchFacebookPages called");
        const userAccessToken = (_a = req.headers.authorization) === null || _a === void 0 ? void 0 : _a.split("Bearer ")[1];
        const rawUserId = req.query.userId ||
            req.query.user_id ||
            req.query.user;
        console.log("===========>", rawUserId);
        if (!userAccessToken) {
            return res
                .status(401)
                .json({ error: "Unauthorized - Missing Facebook Token" });
        }
        if (!rawUserId) {
            return res.status(400).json({ error: "Missing userId in query" });
        }
        const isObjectId = (v) => /^[a-fA-F0-9]{24}$/.test(v);
        const userId = (() => {
            if (isObjectId(rawUserId))
                return rawUserId;
            try {
                const d = atob(String(rawUserId));
                return isObjectId(d) ? d : null;
            }
            catch (_a) {
                return null;
            }
        })();
        if (!userId) {
            return res.status(400).json({
                error: "Invalid userId in query",
            });
        }
        console.log("===========>", userId);
        // Get long-lived token
        const longTokenResponse = yield (0, facebook_service_1.getLongLivedToken)(userAccessToken);
        const longLivedToken = (longTokenResponse === null || longTokenResponse === void 0 ? void 0 : longTokenResponse.access_token) || longTokenResponse;
        //  Save token & fetch pages in parallel
        const [savedUser, pagesResponse] = yield Promise.all([
            users_model_1.default.findByIdAndUpdate(userId, { $set: { "facebook.access_token": longLivedToken } }, { new: true }),
            axios_1.default.get(`https://graph.facebook.com/v20.0/me/accounts`, {
                params: {
                    fields: "id,name,access_token,category,tasks",
                    limit: 200,
                    access_token: longLivedToken,
                },
            }),
        ]);
        console.log("Saved user token : ", savedUser);
        const pages = ((_b = pagesResponse.data) === null || _b === void 0 ? void 0 : _b.data) || [];
        const isProd = process.env.NODE_ENV === "production";
        // If pages are empty, include helpful debug context (non-production only)
        let debug = undefined;
        if (!isProd && Array.isArray(pages) && pages.length === 0) {
            try {
                const appAccessToken = `${process.env.FACEBOOK_CLIENT_ID}|${process.env.FACEBOOK_CLIENT_SECRET}`;
                const [debugTokenRes, permissionsRes] = yield Promise.all([
                    axios_1.default.get("https://graph.facebook.com/debug_token", {
                        params: {
                            input_token: longLivedToken,
                            access_token: appAccessToken,
                        },
                    }),
                    axios_1.default.get("https://graph.facebook.com/v20.0/me/permissions", {
                        params: { access_token: longLivedToken },
                    }),
                ]);
                debug = {
                    debug_token: debugTokenRes.data,
                    permissions: permissionsRes.data,
                };
            }
            catch (dbgErr) {
                debug = {
                    error: ((_c = dbgErr === null || dbgErr === void 0 ? void 0 : dbgErr.response) === null || _c === void 0 ? void 0 : _c.data) || (dbgErr === null || dbgErr === void 0 ? void 0 : dbgErr.message) || String(dbgErr),
                };
            }
        }
        return res.json(Object.assign({ message: "Token saved and pages fetched successfully", user: savedUser, result: pages }, (debug ? { debug } : {})));
    }
    catch (error) {
        console.error("Error saving token or fetching pages:", ((_d = error.response) === null || _d === void 0 ? void 0 : _d.data) || error.message);
        return res.status(500).json({
            error: "Failed to save token or fetch pages",
            details: ((_e = error.response) === null || _e === void 0 ? void 0 : _e.data) || error.message,
        });
    }
});
exports.fetchFacebookPages = fetchFacebookPages;
// Get long Live Access Token
const getAccessTokenLongTerm = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _f;
    try {
        const userPayload = req.body;
        const AccessToken = (_f = req.headers.authorization) === null || _f === void 0 ? void 0 : _f.split("Bearer ")[1];
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
    var _g, _h, _j, _k, _l, _m, _o, _p, _q;
    try {
        const { userId, pageId, message, imageUrl, videoURL } = req.body;
        const uploadedImage = (_h = (_g = req.files) === null || _g === void 0 ? void 0 : _g.image) === null || _h === void 0 ? void 0 : _h[0];
        const uploadedVideo = (_k = (_j = req.files) === null || _j === void 0 ? void 0 : _j.video) === null || _k === void 0 ? void 0 : _k[0];
        const scheduledPublishTime = (0, facebook_service_1.resolveScheduledPublishTime)(req.body);
        // Validate scheduled publish time early to avoid Graph API errors
        const scheduleValidationError = (0, facebook_service_1.validateScheduledPublishTime)(scheduledPublishTime);
        if (scheduleValidationError) {
            return res.status(400).json({
                success: false,
                message: scheduleValidationError,
            });
        }
        if (!userId || !pageId) {
            return res.status(400).json({ error: "userId and pageId are required" });
        }
        // Get page access token
        const { pageAccessToken, id } = yield (0, facebook_service_1.getPageTokenService)(userId, pageId);
        // Priority: if message only, post text; if image present (file or url), post image; if video present, post video
        if (message && !uploadedImage && !uploadedVideo && !imageUrl && !videoURL) {
            // Text only (immediate or scheduled)
            const payload = {
                message,
                access_token: pageAccessToken,
            };
            if (scheduledPublishTime) {
                // Facebook scheduled post requires published=false
                payload.published = false;
                payload.scheduled_publish_time = scheduledPublishTime;
            }
            const postRes = yield axios_1.default.post(`${FACEBOOK_GRAPH_URL}/${id}/feed`, payload);
            // Save to history if not scheduled (scheduled posts are handled by the scheduler service)
            if (!scheduledPublishTime) {
                yield postedContent_model_1.default.create({
                    user_id: userId,
                    platform: "facebook",
                    content: message,
                    posted_at: new Date(),
                    platform_post_id: postRes.data.id,
                    is_scheduled: false,
                    status: "published",
                    page_id: pageId,
                    media_type: "text",
                });
            }
            if (scheduledPublishTime) {
                // Fetch more details for the scheduled post
                const detailsRes = yield axios_1.default.get(`${FACEBOOK_GRAPH_URL}/${postRes.data.id}?fields=id,message,scheduled_publish_time,permalink_url,created_time,is_published`, { headers: { Authorization: `Bearer ${pageAccessToken}` } });
                const sp = detailsRes.data || {};
                const scheduledDetails = {
                    id: sp.id || postRes.data.id,
                    title: sp.message || message || "",
                    scheduledAt: sp.scheduled_publish_time
                        ? new Date(sp.scheduled_publish_time * 1000).toISOString()
                        : new Date(scheduledPublishTime * 1000).toISOString(),
                    permalink_url: sp.permalink_url,
                    created_time: sp.created_time,
                    is_published: Boolean(sp.is_published),
                };
                return res.status(200).json({
                    success: true,
                    scheduled: true,
                    scheduled_publish_time: scheduledPublishTime,
                    details: scheduledDetails,
                    message: "Text scheduled",
                });
            }
            return res.status(200).json({
                success: true,
                postId: postRes.data.id,
                scheduled: Boolean(scheduledPublishTime),
                scheduled_publish_time: scheduledPublishTime || undefined,
                message: scheduledPublishTime ? "Text scheduled" : "Text posted",
            });
        }
        // If image file uploaded -> upload to S3, save to user, post via URL
        if (uploadedImage || imageUrl) {
            let finalImageUrl = imageUrl;
            if (uploadedImage) {
                finalImageUrl = yield (0, uploadFile_1.uploadFileToS3Service)(`facebook_uploads/${userId}`, uploadedImage.buffer, uploadedImage.mimetype || "image/jpeg");
                try {
                    yield users_model_1.default.findByIdAndUpdate(userId, {
                        $set: { "facebook.last_uploaded_image": finalImageUrl },
                    });
                }
                catch (dbErr) {
                    console.warn("Failed to save image URL:", dbErr);
                }
            }
            const imgPayload = {
                url: finalImageUrl,
                // 'caption' is not a valid field on Photo; use 'message' for the photo's caption
                message: message || "",
                access_token: pageAccessToken,
            };
            if (scheduledPublishTime) {
                imgPayload.published = false;
                imgPayload.scheduled_publish_time = scheduledPublishTime;
            }
            const imgRes = yield axios_1.default.post(`${FACEBOOK_GRAPH_URL}/${id}/photos`, imgPayload);
            // Save to history if not scheduled
            // Use post_id (pageId_postId format) from photos endpoint for correct metrics fetching
            if (!scheduledPublishTime) {
                yield postedContent_model_1.default.create({
                    user_id: userId,
                    platform: "facebook",
                    content: message || "",
                    media_urls: [finalImageUrl],
                    media_type: "image",
                    posted_at: new Date(),
                    platform_post_id: imgRes.data.post_id || imgRes.data.id,
                    is_scheduled: false,
                    status: "published",
                    page_id: pageId,
                });
            }
            if (scheduledPublishTime) {
                try {
                    // Do not request 'scheduled_publish_time' on Photo node to avoid errors
                    const detailsRes = yield axios_1.default.get(`${FACEBOOK_GRAPH_URL}/${imgRes.data.id}?fields=id,name,permalink_url,full_picture,created_time,is_published`, { headers: { Authorization: `Bearer ${pageAccessToken}` } });
                    const sp = detailsRes.data || {};
                    const scheduledDetails = {
                        id: sp.id || imgRes.data.id,
                        title: sp.name || message || "",
                        scheduledAt: new Date(scheduledPublishTime * 1000).toISOString(),
                        permalink_url: sp.permalink_url,
                        full_picture: sp.full_picture,
                        created_time: sp.created_time,
                        is_published: Boolean(sp.is_published),
                    };
                    return res.status(200).json({
                        success: true,
                        scheduled: true,
                        scheduled_publish_time: scheduledPublishTime,
                        details: scheduledDetails,
                        message: "Image scheduled",
                    });
                }
                catch (_) {
                    // Fallback if details fetch fails
                    return res.status(200).json({
                        success: true,
                        scheduled: true,
                        scheduled_publish_time: scheduledPublishTime,
                        details: {
                            id: imgRes.data.id,
                            title: message || "",
                            scheduledAt: new Date(scheduledPublishTime * 1000).toISOString(),
                        },
                        message: "Image scheduled",
                    });
                }
            }
            return res.status(200).json({
                success: true,
                postId: imgRes.data.id,
                scheduled: Boolean(scheduledPublishTime),
                scheduled_publish_time: scheduledPublishTime || undefined,
                message: scheduledPublishTime ? "Image scheduled" : "Image posted",
            });
        }
        // If video file uploaded or videoURL provided -> upload to S3 (if file), then post via graph-video endpoint
        if (uploadedVideo || videoURL) {
            let finalVideoUrl = videoURL;
            if (uploadedVideo) {
                finalVideoUrl = yield (0, uploadFile_1.uploadFileToS3Service)(`facebook_uploads/${userId}`, uploadedVideo.buffer, uploadedVideo.mimetype || "video/mp4");
                try {
                    yield users_model_1.default.findByIdAndUpdate(userId, {
                        $set: { "facebook.last_uploaded_video": finalVideoUrl },
                    });
                }
                catch (dbErr) {
                    console.warn("Failed to save video URL:", dbErr);
                }
            }
            const uploadUrl = `https://graph-video.facebook.com/v19.0/${id}/videos`;
            const vidPayload = {
                file_url: finalVideoUrl,
                title: message || "",
            };
            if (scheduledPublishTime) {
                vidPayload.published = false;
                vidPayload.scheduled_publish_time = scheduledPublishTime;
            }
            const resp = yield axios_1.default.post(uploadUrl, vidPayload, {
                headers: { Authorization: `Bearer ${pageAccessToken}` },
            });
            // Save to history if not scheduled
            // Construct proper post ID (pageId_videoId) for correct metrics fetching
            if (!scheduledPublishTime) {
                yield postedContent_model_1.default.create({
                    user_id: userId,
                    platform: "facebook",
                    content: message || "",
                    media_urls: [finalVideoUrl],
                    media_type: "video",
                    posted_at: new Date(),
                    platform_post_id: `${pageId}_${resp.data.id}`,
                    is_scheduled: false,
                    status: "published",
                    page_id: pageId,
                });
            }
            if (scheduledPublishTime) {
                const detailsUrl = `https://graph-video.facebook.com/v19.0/${resp.data.id}?fields=id,permalink_url,scheduled_publish_time,title,description,created_time,thumbnails{uri},is_published`;
                const detailsRes = yield axios_1.default.get(detailsUrl, {
                    headers: { Authorization: `Bearer ${pageAccessToken}` },
                });
                const sp = detailsRes.data || {};
                const thumb = (_o = (_m = (_l = sp.thumbnails) === null || _l === void 0 ? void 0 : _l.data) === null || _m === void 0 ? void 0 : _m[0]) === null || _o === void 0 ? void 0 : _o.uri;
                const scheduledDetails = {
                    id: sp.id || resp.data.id,
                    title: sp.title || message || "",
                    scheduledAt: sp.scheduled_publish_time
                        ? new Date(sp.scheduled_publish_time * 1000).toISOString()
                        : new Date(scheduledPublishTime * 1000).toISOString(),
                    permalink_url: sp.permalink_url,
                    thumbnail: thumb,
                    created_time: sp.created_time,
                    is_published: Boolean(sp.is_published),
                };
                return res.status(200).json({
                    success: true,
                    scheduled: true,
                    scheduled_publish_time: scheduledPublishTime,
                    details: scheduledDetails,
                    message: "Video scheduled",
                });
            }
            return res.status(200).json({
                success: true,
                videoId: resp.data.id,
                scheduled: Boolean(scheduledPublishTime),
                scheduled_publish_time: scheduledPublishTime || undefined,
                message: scheduledPublishTime ? "Video scheduled" : "Video posted",
            });
        }
        return res.status(400).json({ error: "No valid content to post" });
    }
    catch (error) {
        console.error("Universal Facebook post error:", ((_p = error.response) === null || _p === void 0 ? void 0 : _p.data) || error.message);
        return res
            .status(500)
            .json({ success: false, error: ((_q = error.response) === null || _q === void 0 ? void 0 : _q.data) || error.message });
    }
});
exports.postFacebookUniversal = postFacebookUniversal;
const getFacebookAllDetails = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _r, _s;
    try {
        const { userId, pageId } = req.query;
        if (!userId || !pageId) {
            return res
                .status(400)
                .json({ success: false, message: "userId and pageId are required" });
        }
        const { pageAccessToken, id: resolvedPageId } = yield (0, facebook_service_1.getPageTokenService)(userId, pageId);
        const pid = resolvedPageId || pageId;
        // Build dashboard using modular services; handle missing insights with flags
        const dashboard = yield (0, dashboard_builder_1.buildFacebookDashboardBuilder)(pid, pageAccessToken, "28d");
        return res.status(200).json({ success: true, result: dashboard });
    }
    catch (error) {
        console.error("Error fetching Facebook all details:", ((_r = error.response) === null || _r === void 0 ? void 0 : _r.data) || error.message);
        return res.status(500).json({
            success: false,
            message: "Failed to fetch facebook details",
            error: ((_s = error.response) === null || _s === void 0 ? void 0 : _s.data) || error.message,
        });
    }
});
exports.getFacebookAllDetails = getFacebookAllDetails;
const disconnectFacebook = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _t, _u, _v, _w, _x, _y;
    try {
        const userId = ((_t = req.body) === null || _t === void 0 ? void 0 : _t.userId) ||
            ((_u = req.body) === null || _u === void 0 ? void 0 : _u.user_id) ||
            ((_v = req.query) === null || _v === void 0 ? void 0 : _v.userId) ||
            ((_w = req.query) === null || _w === void 0 ? void 0 : _w.user_id);
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
        const tokenToRevoke = (_x = user.facebook) === null || _x === void 0 ? void 0 : _x.access_token;
        const updatedUser = yield users_model_1.default.findByIdAndUpdate(userId, {
            $set: {
                "facebook.project_id": null,
                "facebook.name": null,
                "facebook.access_token": null,
            },
        }, { new: true }).exec();
        if (tokenToRevoke) {
            try {
                // Revoke app permissions for the user
                yield axios_1.default.delete(`${FACEBOOK_GRAPH_URL}/me/permissions`, {
                    headers: { Authorization: `Bearer ${tokenToRevoke}` },
                });
            }
            catch (revokeErr) {
                console.warn("Failed to revoke Facebook token:", ((_y = revokeErr === null || revokeErr === void 0 ? void 0 : revokeErr.response) === null || _y === void 0 ? void 0 : _y.data) || (revokeErr === null || revokeErr === void 0 ? void 0 : revokeErr.message) || revokeErr);
            }
        }
        return res.status(200).json({
            success: true,
            message: "Facebook disconnected successfully",
            user: updatedUser,
        });
    }
    catch (error) {
        console.error("Error disconnecting Facebook:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to disconnect Facebook",
            error: error.message,
        });
    }
});
exports.disconnectFacebook = disconnectFacebook;
