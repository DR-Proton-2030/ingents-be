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
exports.getRecentVideos = exports.getRecentPosts = exports.getPageDetails = void 0;
const axios_1 = __importDefault(require("axios"));
const FACEBOOK_GRAPH_URL = "https://graph.facebook.com/v20.0";
function getPageDetails(pageId, accessToken) {
    return __awaiter(this, void 0, void 0, function* () {
        const url = `${FACEBOOK_GRAPH_URL}/${pageId}`;
        const fields = [
            "id",
            "name",
            "about",
            "fan_count",
            "link",
            "cover",
            "category",
            "location",
            "username",
            "picture{url}",
        ].join(",");
        try {
            const resp = yield axios_1.default.get(url, {
                params: { fields },
                headers: { Authorization: `Bearer ${accessToken}` },
            });
            return resp.data;
        }
        catch (_) {
            return null;
        }
    });
}
exports.getPageDetails = getPageDetails;
function getRecentPosts(pageId_1, accessToken_1, sinceISO_1, untilISO_1) {
    return __awaiter(this, arguments, void 0, function* (pageId, accessToken, sinceISO, untilISO, limit = 25) {
        var _a;
        const url = `${FACEBOOK_GRAPH_URL}/${pageId}/posts`;
        const fields = [
            "id",
            "created_time",
            "message",
            "permalink_url",
            "full_picture",
            "type",
            // Include comments summary to mirror YouTube-like recent activity
            "comments.summary(true){id,message,created_time,from}",
        ].join(",");
        try {
            const resp = yield axios_1.default.get(url, {
                params: { since: sinceISO, until: untilISO, limit, fields },
                headers: { Authorization: `Bearer ${accessToken}` },
            });
            return ((_a = resp.data) === null || _a === void 0 ? void 0 : _a.data) || [];
        }
        catch (_) {
            return [];
        }
    });
}
exports.getRecentPosts = getRecentPosts;
function getRecentVideos(pageId_1, accessToken_1, sinceISO_1, untilISO_1) {
    return __awaiter(this, arguments, void 0, function* (pageId, accessToken, sinceISO, untilISO, limit = 25) {
        var _a;
        // Use page videos edge to retrieve page-owned videos during window
        const url = `${FACEBOOK_GRAPH_URL}/${pageId}/videos`;
        const fields = [
            "id",
            "created_time",
            "description",
            "permalink_url",
            "length",
            "thumbnails{uri}",
            "title",
        ].join(",");
        try {
            const resp = yield axios_1.default.get(url, {
                params: { since: sinceISO, until: untilISO, limit, fields },
                headers: { Authorization: `Bearer ${accessToken}` },
            });
            return ((_a = resp.data) === null || _a === void 0 ? void 0 : _a.data) || [];
        }
        catch (_) {
            return [];
        }
    });
}
exports.getRecentVideos = getRecentVideos;
