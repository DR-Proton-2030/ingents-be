"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const youtube_controller_1 = require("../../controller/youtube/youtube.controller");
const multer_middleware_1 = require("../../middlewares/helper/multer/multer.middleware");
const youtubeRouter = express_1.default.Router();
youtubeRouter.get("/auth", youtube_controller_1.youtubeAuth);
youtubeRouter.get("/callback", youtube_controller_1.youtubeCallback);
youtubeRouter.get("/get-channel", youtube_controller_1.getYoutubeChannelDetails);
youtubeRouter.post("/disconnect", youtube_controller_1.disconnectYoutube);
youtubeRouter.post("/upload-video", multer_middleware_1.upload.single("video"), youtube_controller_1.uploadYoutubeVideo);
// Videos
youtubeRouter.get("/videos", youtube_controller_1.getAllYoutubeVideos);
// Comments
youtubeRouter.post("/comments", youtube_controller_1.getVideoComments);
youtubeRouter.post("/comments/add", youtube_controller_1.addVideoComment);
youtubeRouter.post("/comments/reply", youtube_controller_1.replyToYoutubeComment);
// Subscribers & Subscriptions
youtubeRouter.post("/subscribers", youtube_controller_1.getSubscribers);
youtubeRouter.post("/subscribers/recent", youtube_controller_1.getRecentSubscribers);
youtubeRouter.post("/subscriptions", youtube_controller_1.getUserSubscriptions);
// Statistics
youtubeRouter.post("/video/stats", youtube_controller_1.getVideoStatistics);
youtubeRouter.post("/video/analytics", youtube_controller_1.getSingleVideoAnalytics);
youtubeRouter.post("/channel/stats", youtube_controller_1.getChannelStatistics);
youtubeRouter.get("/channel/get-all-details", youtube_controller_1.getYoutubeAllDetails);
// Delete video
youtubeRouter.post("/video/delete", youtube_controller_1.deleteYoutubeVideo);
exports.default = youtubeRouter;
