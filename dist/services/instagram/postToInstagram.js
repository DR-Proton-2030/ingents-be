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
exports.postToInstagram = void 0;
const axios_1 = __importDefault(require("axios"));
const users_model_1 = __importDefault(require("../../models/users/users.model"));
/**
 * Post content to Instagram - used by scheduler
 */
const postToInstagram = (_a) => __awaiter(void 0, [_a], void 0, function* ({ userId, message, mediaUrls, hashtags, }) {
    var _b;
    // Get user and access token
    const user = yield users_model_1.default.findById(userId).exec();
    if (!user || !((_b = user.instagram) === null || _b === void 0 ? void 0 : _b.access_token)) {
        throw new Error("Instagram user access token not found");
    }
    const accessToken = user.instagram.access_token;
    const igUserId = user.instagram.project_id;
    if (!igUserId) {
        throw new Error("Instagram user ID not found");
    }
    // Append hashtags to message
    let caption = message;
    if (hashtags && hashtags.length > 0) {
        caption += "\n\n" + hashtags.map((tag) => (tag.startsWith("#") ? tag : `#${tag}`)).join(" ");
    }
    if (!mediaUrls || mediaUrls.length === 0) {
        throw new Error("Instagram requires media (image or video) to post");
    }
    const mediaUrl = mediaUrls[0];
    const isVideo = mediaUrl.includes("video") || mediaUrl.match(/\.(mp4|mov|avi|wmv|webm)$/i);
    // Create media container
    const containerPayload = {
        caption,
    };
    if (isVideo) {
        containerPayload.media_type = "REELS";
        containerPayload.video_url = mediaUrl;
    }
    else {
        containerPayload.image_url = mediaUrl;
    }
    const createContainerRes = yield axios_1.default.post(`https://graph.instagram.com/v18.0/${igUserId}/media`, containerPayload, {
        headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
        },
    });
    const containerId = createContainerRes.data.id;
    // For videos, we need to wait for processing
    if (isVideo) {
        let status = "IN_PROGRESS";
        let attempts = 0;
        const maxAttempts = 30; // 5 minutes max wait
        while (status === "IN_PROGRESS" && attempts < maxAttempts) {
            yield new Promise((resolve) => setTimeout(resolve, 10000)); // Wait 10 seconds
            const statusRes = yield axios_1.default.get(`https://graph.instagram.com/v18.0/${containerId}?fields=status_code`, {
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                },
            });
            status = statusRes.data.status_code;
            attempts++;
        }
        if (status !== "FINISHED") {
            throw new Error(`Video processing failed or timed out. Status: ${status}`);
        }
    }
    // Publish the media
    const publishRes = yield axios_1.default.post(`https://graph.instagram.com/v18.0/${igUserId}/media_publish`, {
        creation_id: containerId,
    }, {
        headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
        },
    });
    return publishRes.data;
});
exports.postToInstagram = postToInstagram;
__exportStar(require("./instagram.service"), exports);
