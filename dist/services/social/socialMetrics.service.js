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
const socialData_model_1 = __importDefault(require("../../models/socialData/socialData.model"));
function fetchSocialMetrics(userId) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q;
        const items = [];
        const errors = [];
        try {
            // Fetch all social data records for the user from the database
            const allSocialData = yield socialData_model_1.default.find({
                user_object_id: userId,
            }).exec();
            // Map each platform's data to the requested metrics format
            for (const doc of allSocialData) {
                let count = 0;
                let metric = "followers";
                try {
                    if (doc.platform_name === "youtube") {
                        // YouTube subscribers are stored in channel statistics
                        count = Number(((_c = (_b = (_a = doc.data) === null || _a === void 0 ? void 0 : _a.channel) === null || _b === void 0 ? void 0 : _b.statistics) === null || _c === void 0 ? void 0 : _c.subscriberCount) || 0);
                        metric = "subscribers";
                    }
                    else if (doc.platform_name === "facebook") {
                        // Facebook followers are typically stored in fan_count or followers_count
                        count = Number(((_e = (_d = doc.data) === null || _d === void 0 ? void 0 : _d.page) === null || _e === void 0 ? void 0 : _e.fan_count) || ((_g = (_f = doc.data) === null || _f === void 0 ? void 0 : _f.page) === null || _g === void 0 ? void 0 : _g.followers_count) || 0);
                        metric = "followers";
                    }
                    else if (doc.platform_name === "x") {
                        // X (Twitter) followers are in public_metrics
                        count = Number(((_j = (_h = doc.data) === null || _h === void 0 ? void 0 : _h.public_metrics) === null || _j === void 0 ? void 0 : _j.followers_count) || 0);
                        metric = "metric" in (doc.data || {}) ? doc.data.metric : "followers"; // fallback for different possible structures
                        if (((_l = (_k = doc.data) === null || _k === void 0 ? void 0 : _k.public_metrics) === null || _l === void 0 ? void 0 : _l.followers_count) !== undefined) {
                            count = Number(doc.data.public_metrics.followers_count);
                        }
                        else if (typeof doc.data === 'number') {
                            count = doc.data;
                        }
                        metric = "followers";
                    }
                    else if (doc.platform_name === "instagram") {
                        // Instagram followers
                        count = Number(((_o = (_m = doc.data) === null || _m === void 0 ? void 0 : _m.overview) === null || _o === void 0 ? void 0 : _o.followersCount) || ((_q = (_p = doc.data) === null || _p === void 0 ? void 0 : _p.business_discovery) === null || _q === void 0 ? void 0 : _q.followers_count) || 0);
                        metric = "followers";
                    }
                    items.push({
                        platform: doc.platform_name,
                        metric,
                        count,
                        last_synced_at: doc.last_synced_at,
                    });
                }
                catch (innerErr) {
                    errors.push({
                        platform: doc.platform_name,
                        message: `Error parsing data from database: ${innerErr.message}`,
                    });
                }
            }
        }
        catch (err) {
            console.error("fetchSocialMetrics error:", err);
            throw new Error(`Failed to fetch social metrics from database: ${err.message}`);
        }
        return { items, errors };
    });
}
exports.fetchSocialMetrics = fetchSocialMetrics;
