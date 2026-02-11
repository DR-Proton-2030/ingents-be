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
Object.defineProperty(exports, "__esModule", { value: true });
exports.getDemographics = exports.getFollowersVsNonFollowersViews = void 0;
const pageInsights_1 = require("./insights/pageInsights");
const videoInsights_1 = require("./insights/videoInsights");
function getFollowersVsNonFollowersViews(videoIds, accessToken) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a, _b, _c, _d, _e, _f;
        let followerViews = 0;
        let nonFollowerViews = 0;
        for (const vid of videoIds) {
            const ins = yield (0, videoInsights_1.getVideoInsights)(vid, accessToken, [
                "total_video_views_follower",
                "total_video_views_non_follower",
            ]);
            followerViews +=
                ((_c = (_b = (_a = ins.find((i) => i.name === "total_video_views_follower")) === null || _a === void 0 ? void 0 : _a.values) === null || _b === void 0 ? void 0 : _b[0]) === null || _c === void 0 ? void 0 : _c.value) || 0;
            nonFollowerViews +=
                ((_f = (_e = (_d = ins.find((i) => i.name === "total_video_views_non_follower")) === null || _d === void 0 ? void 0 : _d.values) === null || _e === void 0 ? void 0 : _e[0]) === null || _f === void 0 ? void 0 : _f.value) || 0;
        }
        const unavailable = !(followerViews || nonFollowerViews);
        return {
            watchTimeSplitUnavailable: unavailable,
            watchTimeSplit: [
                { label: "Followers", value: followerViews },
                { label: "Non-followers", value: nonFollowerViews },
            ],
        };
    });
}
exports.getFollowersVsNonFollowersViews = getFollowersVsNonFollowersViews;
function getDemographics(pageId, accessToken) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a, _b, _c, _d, _e, _f;
        // Lifetime demographics; may be unavailable depending on page/app
        const genderAge = yield (0, pageInsights_1.getPageInsights)(pageId, accessToken, ["page_fans_gender_age"], undefined, undefined, "lifetime");
        const country = yield (0, pageInsights_1.getPageInsights)(pageId, accessToken, ["page_fans_country"], undefined, undefined, "lifetime");
        const city = yield (0, pageInsights_1.getPageInsights)(pageId, accessToken, ["page_fans_city"], undefined, undefined, "lifetime");
        // Values for demographic metrics are key-value maps on the last value entry
        const gaValues = ((_b = (((_a = genderAge[0]) === null || _a === void 0 ? void 0 : _a.values) || []).slice(-1)[0]) === null || _b === void 0 ? void 0 : _b.value) || {};
        const countryValues = ((_d = (((_c = country[0]) === null || _c === void 0 ? void 0 : _c.values) || []).slice(-1)[0]) === null || _d === void 0 ? void 0 : _d.value) || {};
        const cityValues = ((_f = (((_e = city[0]) === null || _e === void 0 ? void 0 : _e.values) || []).slice(-1)[0]) === null || _f === void 0 ? void 0 : _f.value) || {};
        // Transform maps into arrays consumable by frontend
        const ageGender = Object.entries(gaValues).map(([k, v]) => ({
            label: k,
            value: Number(v) || 0,
        }));
        const countries = Object.entries(countryValues).map(([k, v]) => ({
            label: k,
            value: Number(v) || 0,
        }));
        const cities = Object.entries(cityValues).map(([k, v]) => ({
            label: k,
            value: Number(v) || 0,
        }));
        return {
            ageGender,
            countries,
            cities,
        };
    });
}
exports.getDemographics = getDemographics;
