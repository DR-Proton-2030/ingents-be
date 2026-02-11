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
exports.postToX = void 0;
const axios_1 = __importDefault(require("axios"));
const users_model_1 = __importDefault(require("../../models/users/users.model"));
const x_service_1 = require("./x.service");
/**
 * Post content to X (Twitter) - used by scheduler
 */
const postToX = (_a) => __awaiter(void 0, [_a], void 0, function* ({ userId, message, mediaUrls, hashtags, }) {
    var _b, _c;
    // Get user and access token
    const user = yield users_model_1.default.findById(userId).exec();
    if (!user || !((_b = user.x) === null || _b === void 0 ? void 0 : _b.access_token)) {
        throw new Error("X user access token not found");
    }
    let accessToken = user.x.access_token;
    // Append hashtags to message
    let fullMessage = message;
    if (hashtags && hashtags.length > 0) {
        fullMessage += "\n\n" + hashtags.map((tag) => (tag.startsWith("#") ? tag : `#${tag}`)).join(" ");
    }
    // Truncate to 280 characters if needed
    if (fullMessage.length > 280) {
        fullMessage = fullMessage.slice(0, 277) + "...";
    }
    const tweetPayload = {
        text: fullMessage,
    };
    // Upload media if provided
    if (mediaUrls && mediaUrls.length > 0) {
        try {
            const mediaIds = yield uploadMediaToX(accessToken, mediaUrls);
            if (mediaIds.length > 0) {
                tweetPayload.media = {
                    media_ids: mediaIds,
                };
            }
        }
        catch (mediaError) {
            console.warn("Failed to upload media to X:", mediaError.message);
            // Continue without media
        }
    }
    try {
        const response = yield axios_1.default.post("https://api.twitter.com/2/tweets", tweetPayload, {
            headers: {
                Authorization: `Bearer ${accessToken}`,
                "Content-Type": "application/json",
            },
        });
        return response.data;
    }
    catch (error) {
        // If token expired, try to refresh and retry
        if (((_c = error.response) === null || _c === void 0 ? void 0 : _c.status) === 401) {
            const tokens = yield (0, x_service_1.refreshXToken)(userId);
            accessToken = tokens.access_token;
            const retryResponse = yield axios_1.default.post("https://api.twitter.com/2/tweets", tweetPayload, {
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                    "Content-Type": "application/json",
                },
            });
            return retryResponse.data;
        }
        throw error;
    }
});
exports.postToX = postToX;
/**
 * Upload media to X and return media IDs
 */
function uploadMediaToX(accessToken, mediaUrls) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a;
        const mediaIds = [];
        for (const mediaUrl of mediaUrls.slice(0, 4)) { // X allows max 4 media
            try {
                // Download media from URL
                const mediaResponse = yield axios_1.default.get(mediaUrl, {
                    responseType: "arraybuffer",
                });
                const mediaBuffer = Buffer.from(mediaResponse.data);
                const mediaBase64 = mediaBuffer.toString("base64");
                const contentType = mediaResponse.headers["content-type"] || "image/jpeg";
                // Check if it's a video
                const isVideo = contentType.includes("video");
                if (isVideo) {
                    // For videos, use chunked upload
                    // This is a simplified version - full implementation requires chunked upload
                    console.warn("Video upload to X requires chunked upload implementation");
                    continue;
                }
                // Upload image using v1.1 API
                const uploadResponse = yield axios_1.default.post("https://upload.twitter.com/1.1/media/upload.json", `media_data=${encodeURIComponent(mediaBase64)}`, {
                    headers: {
                        Authorization: `Bearer ${accessToken}`,
                        "Content-Type": "application/x-www-form-urlencoded",
                    },
                });
                if ((_a = uploadResponse.data) === null || _a === void 0 ? void 0 : _a.media_id_string) {
                    mediaIds.push(uploadResponse.data.media_id_string);
                }
            }
            catch (error) {
                console.warn(`Failed to upload media ${mediaUrl}:`, error.message);
            }
        }
        return mediaIds;
    });
}
__exportStar(require("./x.service"), exports);
