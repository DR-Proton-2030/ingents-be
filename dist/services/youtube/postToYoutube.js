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
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
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
exports.postToYoutube = void 0;
const users_model_1 = __importDefault(require("../../models/users/users.model"));
const youtube_service_1 = require("./youtube.service");
const stream_1 = require("stream");
/**
 * Post video to YouTube - used by scheduler
 */
const postToYoutube = (_a) => __awaiter(void 0, [_a], void 0, function* ({ userId, title, description, videoUrl, tags, privacyStatus = "public", categoryId = "22", // Default to "People & Blogs"
thumbnailDataUrl, }) {
    var _b;
    // Get user and access token
    const user = yield users_model_1.default.findById(userId).exec();
    if (!user || !((_b = user.youtube) === null || _b === void 0 ? void 0 : _b.access_token)) {
        throw new Error("YouTube user access token not found");
    }
    const refreshToken = user.youtube.access_token;
    // Get authorized client
    const { youtube } = yield (0, youtube_service_1.getAuthorizedClient)(refreshToken);
    // Download video from URL
    const axios = (yield Promise.resolve().then(() => __importStar(require("axios")))).default;
    const videoResponse = yield axios.get(videoUrl, {
        responseType: "stream",
    });
    // Upload video to YouTube
    const response = yield youtube.videos.insert({
        part: ["snippet", "status"],
        requestBody: {
            snippet: {
                title,
                description,
                tags,
                categoryId,
            },
            status: {
                privacyStatus,
                selfDeclaredMadeForKids: false,
            },
        },
        media: {
            body: videoResponse.data,
        },
    });
    const videoId = response.data.id;
    if (videoId && typeof thumbnailDataUrl === "string" && thumbnailDataUrl.startsWith("data:")) {
        try {
            const match = thumbnailDataUrl.match(/^data:(.+);base64,(.+)$/);
            if (match) {
                const buffer = Buffer.from(match[2], "base64");
                yield youtube.thumbnails.set({
                    videoId,
                    media: { body: stream_1.Readable.from(buffer) },
                });
            }
        }
        catch (err) {
            console.warn("Failed to set YouTube thumbnail (scheduler):", (err === null || err === void 0 ? void 0 : err.message) || err);
        }
    }
    return response.data;
});
exports.postToYoutube = postToYoutube;
__exportStar(require("./youtube.service"), exports);
