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
exports.fetchSocialMetrics = void 0;
const axios_1 = __importDefault(require("axios"));
const users_model_1 = __importDefault(require("../../models/users/users.model"));
const facebook_service_1 = require("../facebook/facebook.service");
const youtube_service_1 = require("../youtube/youtube.service");
const x_service_1 = require("../x/x.service");
function fetchSocialMetrics(userId) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q, _r, _s, _t, _u, _v, _w, _x, _y, _z, _0, _1;
        const errors = [];
        const items = [];
        // Load user for tokens once
        const user = yield users_model_1.default.findById(userId).exec();
        if (!user) {
            throw new Error("User not found");
        }
        // Facebook followers (fan_count from Page)
        try {
            if ((_a = user.facebook) === null || _a === void 0 ? void 0 : _a.access_token) {
                // Prefer a specifically connected page if recorded
                const preferredPageId = ((_b = user.facebook) === null || _b === void 0 ? void 0 : _b.project_id) || undefined;
                if (preferredPageId) {
                    try {
                        const { pageAccessToken, id } = yield (0, facebook_service_1.getPageTokenService)(userId, preferredPageId);
                        const pageDetails = yield axios_1.default.get(`https://graph.facebook.com/v20.0/${id}?fields=fan_count`, { headers: { Authorization: `Bearer ${pageAccessToken}` } });
                        const fanCount = Number(((_c = pageDetails.data) === null || _c === void 0 ? void 0 : _c.fan_count) || 0);
                        items.push({
                            platform: "facebook",
                            metric: "followers",
                            count: fanCount,
                        });
                    }
                    catch (prefErr) {
                        // Fall back to scanning all pages if preferred lookup fails
                        const pagesResp = yield axios_1.default.get(`https://graph.facebook.com/v20.0/me/accounts?fields=id,name,access_token&access_token=${user.facebook.access_token}`);
                        const pages = ((_d = pagesResp.data) === null || _d === void 0 ? void 0 : _d.data) || [];
                        if (!pages.length) {
                            items.push({ platform: "facebook", metric: "followers", count: 0 });
                        }
                        else {
                            const counts = yield Promise.all(pages.slice(0, 10).map((p) => __awaiter(this, void 0, void 0, function* () {
                                var _2;
                                try {
                                    const resp = yield axios_1.default.get(`https://graph.facebook.com/v20.0/${p.id}?fields=fan_count`, { headers: { Authorization: `Bearer ${p.access_token}` } });
                                    return Number(((_2 = resp.data) === null || _2 === void 0 ? void 0 : _2.fan_count) || 0);
                                }
                                catch (_) {
                                    return 0;
                                }
                            })));
                            const maxCount = counts.reduce((a, b) => (b > a ? b : a), 0);
                            items.push({
                                platform: "facebook",
                                metric: "followers",
                                count: maxCount,
                            });
                        }
                    }
                }
                else {
                    // Fetch all managed pages and use the one with the highest fan_count
                    const pagesResp = yield axios_1.default.get(`https://graph.facebook.com/v20.0/me/accounts?fields=id,name,access_token&access_token=${user.facebook.access_token}`);
                    const pages = ((_e = pagesResp.data) === null || _e === void 0 ? void 0 : _e.data) || [];
                    if (!pages.length) {
                        items.push({ platform: "facebook", metric: "followers", count: 0 });
                    }
                    else {
                        const counts = yield Promise.all(pages.slice(0, 10).map((p) => __awaiter(this, void 0, void 0, function* () {
                            var _3;
                            try {
                                const resp = yield axios_1.default.get(`https://graph.facebook.com/v20.0/${p.id}?fields=fan_count`, { headers: { Authorization: `Bearer ${p.access_token}` } });
                                return Number(((_3 = resp.data) === null || _3 === void 0 ? void 0 : _3.fan_count) || 0);
                            }
                            catch (_) {
                                return 0;
                            }
                        })));
                        const maxCount = counts.reduce((a, b) => (b > a ? b : a), 0);
                        items.push({
                            platform: "facebook",
                            metric: "followers",
                            count: maxCount,
                        });
                    }
                }
            }
            else {
                // Graceful fallback: return zero followers without raising an error
                items.push({ platform: "facebook", metric: "followers", count: 0 });
            }
        }
        catch (fbErr) {
            const status = (_f = fbErr === null || fbErr === void 0 ? void 0 : fbErr.response) === null || _f === void 0 ? void 0 : _f.status;
            let message = ((_j = (_h = (_g = fbErr === null || fbErr === void 0 ? void 0 : fbErr.response) === null || _g === void 0 ? void 0 : _g.data) === null || _h === void 0 ? void 0 : _h.error) === null || _j === void 0 ? void 0 : _j.message) ||
                (fbErr === null || fbErr === void 0 ? void 0 : fbErr.message) ||
                "Failed to fetch Facebook followers";
            if (status === 401)
                message = "Invalid or expired Facebook access token";
            else if (status === 403)
                message = "Insufficient Facebook permissions to access pages";
            else if (status === 429)
                message = "Facebook rate limit exceeded";
            errors.push({ platform: "facebook", message });
        }
        // YouTube subscribers
        try {
            const ytToken = (_k = user.youtube) === null || _k === void 0 ? void 0 : _k.access_token;
            if (ytToken) {
                const { youtube } = yield (0, youtube_service_1.getAuthorizedClient)(ytToken);
                const { data } = yield youtube.channels.list({
                    part: ["statistics"],
                    mine: true,
                });
                const stats = (_m = (_l = data.items) === null || _l === void 0 ? void 0 : _l[0]) === null || _m === void 0 ? void 0 : _m.statistics;
                const subsStr = stats === null || stats === void 0 ? void 0 : stats.subscriberCount;
                const hidden = (stats === null || stats === void 0 ? void 0 : stats.hiddenSubscriberCount) === true;
                if (hidden) {
                    errors.push({
                        platform: "youtube",
                        message: "Subscriber count hidden by channel settings",
                    });
                }
                if (subsStr == null) {
                    errors.push({
                        platform: "youtube",
                        message: "Subscriber count unavailable (may be hidden)",
                    });
                }
                if (!hidden) {
                    const subs = subsStr ? Number(subsStr) : 0;
                    items.push({ platform: "youtube", metric: "subscribers", count: subs });
                }
            }
            else {
                errors.push({
                    platform: "youtube",
                    message: "Missing YouTube refresh token",
                });
            }
        }
        catch (ytErr) {
            const status = (_o = ytErr === null || ytErr === void 0 ? void 0 : ytErr.response) === null || _o === void 0 ? void 0 : _o.status;
            let message = ((_r = (_q = (_p = ytErr === null || ytErr === void 0 ? void 0 : ytErr.response) === null || _p === void 0 ? void 0 : _p.data) === null || _q === void 0 ? void 0 : _q.error) === null || _r === void 0 ? void 0 : _r.message) ||
                (ytErr === null || ytErr === void 0 ? void 0 : ytErr.message) ||
                "Failed to fetch YouTube subscribers";
            if (status === 401)
                message = "Invalid or expired YouTube token";
            else if (status === 403)
                message = "YouTube access forbidden (check scopes/permissions)";
            else if (status === 429)
                message = "YouTube rate limit exceeded";
            errors.push({ platform: "youtube", message });
        }
        // X followers
        try {
            const xAccessToken = (_s = user.x) === null || _s === void 0 ? void 0 : _s.access_token;
            if (xAccessToken) {
                // Prefer the authenticated user via access token
                let profile;
                try {
                    profile = yield (0, x_service_1.getXUserProfile)(xAccessToken);
                }
                catch (innerErr) {
                    const status = (_t = innerErr === null || innerErr === void 0 ? void 0 : innerErr.response) === null || _t === void 0 ? void 0 : _t.status;
                    const hasRefresh = Boolean((_u = user.x) === null || _u === void 0 ? void 0 : _u.refresh_token);
                    if (status === 401 && hasRefresh) {
                        // Attempt a one-time refresh and retry
                        try {
                            const tokens = yield (0, x_service_1.refreshXToken)(userId);
                            profile = yield (0, x_service_1.getXUserProfile)(tokens.access_token);
                        }
                        catch (refreshErr) {
                            const rStatus = (_v = refreshErr === null || refreshErr === void 0 ? void 0 : refreshErr.response) === null || _v === void 0 ? void 0 : _v.status;
                            let message = ((_x = (_w = refreshErr === null || refreshErr === void 0 ? void 0 : refreshErr.response) === null || _w === void 0 ? void 0 : _w.data) === null || _x === void 0 ? void 0 : _x.error) ||
                                (refreshErr === null || refreshErr === void 0 ? void 0 : refreshErr.message) ||
                                "Failed to refresh X token";
                            if (rStatus === 401)
                                message = "Invalid X refresh token";
                            else if (rStatus === 403)
                                message = "X refresh forbidden (check app scopes)";
                            else if (rStatus === 429)
                                message = "X rate limit exceeded during refresh";
                            errors.push({ platform: "x", message });
                        }
                    }
                    else {
                        // Bubble up original error if not refreshable
                        throw innerErr;
                    }
                }
                if (profile) {
                    const followersRaw = (_y = profile === null || profile === void 0 ? void 0 : profile.public_metrics) === null || _y === void 0 ? void 0 : _y.followers_count;
                    if (followersRaw == null) {
                        errors.push({
                            platform: "x",
                            message: "Followers count unavailable from X API (check app access and scopes)",
                        });
                    }
                    const followers = followersRaw != null ? Number(followersRaw) : 0;
                    items.push({ platform: "x", metric: "followers", count: followers });
                }
            }
            else {
                errors.push({ platform: "x", message: "Missing X access token" });
            }
        }
        catch (xErr) {
            const status = (_z = xErr === null || xErr === void 0 ? void 0 : xErr.response) === null || _z === void 0 ? void 0 : _z.status;
            let message = ((_1 = (_0 = xErr === null || xErr === void 0 ? void 0 : xErr.response) === null || _0 === void 0 ? void 0 : _0.data) === null || _1 === void 0 ? void 0 : _1.error) ||
                (xErr === null || xErr === void 0 ? void 0 : xErr.message) ||
                "Failed to fetch X followers";
            if (status === 401)
                message = "Invalid or expired X (Twitter) access token";
            else if (status === 403)
                message = "X access forbidden (check app scopes)";
            else if (status === 429)
                message = "X rate limit exceeded";
            errors.push({ platform: "x", message });
        }
        return { items, errors };
    });
}
exports.fetchSocialMetrics = fetchSocialMetrics;
