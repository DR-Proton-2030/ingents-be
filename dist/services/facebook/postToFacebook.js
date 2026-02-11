"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
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
exports.postToFacebook = void 0;
const axios_1 = __importDefault(require("axios"));
const users_model_1 = __importDefault(require("../../models/users/users.model"));
const FACEBOOK_GRAPH_URL = "https://graph.facebook.com";
/**
 * Post content to Facebook page - used by scheduler
 */
const postToFacebook = (_a) => __awaiter(void 0, [_a], void 0, function* ({ userId, pageId, message, mediaUrls, hashtags, }) {
    var _b, _c, _d;
    // Get user and page access token
    const user = yield users_model_1.default.findById(userId).exec();
    if (!user || !((_b = user.facebook) === null || _b === void 0 ? void 0 : _b.access_token)) {
        throw new Error("Facebook user access token not found");
    }
    const userAccessToken = user.facebook.access_token;
    // Get page access token
    const pagesRes = yield axios_1.default.get(`${FACEBOOK_GRAPH_URL}/v20.0/me/accounts?access_token=${userAccessToken}`);
    const pageData = (_d = (_c = pagesRes.data) === null || _c === void 0 ? void 0 : _c.data) === null || _d === void 0 ? void 0 : _d.find((p) => p.id === pageId);
    if (!pageData) {
        throw new Error("Page not found or user is not admin of this page");
    }
    const pageAccessToken = pageData.access_token;
    // Append hashtags to message
    let fullMessage = message;
    if (hashtags && hashtags.length > 0) {
        fullMessage += "\n\n" + hashtags.map((tag) => (tag.startsWith("#") ? tag : `#${tag}`)).join(" ");
    }
    // Post based on media type
    if (mediaUrls && mediaUrls.length > 0) {
        // Check if it's a video
        const isVideo = mediaUrls[0].includes("video") || mediaUrls[0].match(/\.(mp4|mov|avi|wmv|webm)$/i);
        if (isVideo) {
            // Post video
            const videoRes = yield axios_1.default.post(`${FACEBOOK_GRAPH_URL}/v20.0/${pageId}/videos`, {
                file_url: mediaUrls[0],
                description: fullMessage,
            }, {
                headers: {
                    Authorization: `Bearer ${pageAccessToken}`,
                },
            });
            return videoRes.data;
        }
        else {
            // Post with photo
            const photoRes = yield axios_1.default.post(`${FACEBOOK_GRAPH_URL}/v20.0/${pageId}/photos`, {
                url: mediaUrls[0],
                message: fullMessage,
            }, {
                headers: {
                    Authorization: `Bearer ${pageAccessToken}`,
                },
            });
            return photoRes.data;
        }
    }
    else {
        // Text-only post
        const postRes = yield axios_1.default.post(`${FACEBOOK_GRAPH_URL}/v20.0/${pageId}/feed`, {
            message: fullMessage,
        }, {
            headers: {
                Authorization: `Bearer ${pageAccessToken}`,
            },
        });
        return postRes.data;
    }
});
exports.postToFacebook = postToFacebook;
__exportStar(require("./facebook.service"), exports);
