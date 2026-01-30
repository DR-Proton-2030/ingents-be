import express from "express";
import {
  youtubeAuth,
  youtubeCallback,
  getYoutubeChannelDetails,
  uploadYoutubeVideo,
  getAllYoutubeVideos,
  getVideoComments,
  addVideoComment,
  replyToYoutubeComment,
  getSubscribers,
  getRecentSubscribers,
  getUserSubscriptions,
  getVideoStatistics,
  getChannelStatistics,
  getYoutubeAllDetails,
} from "../../controller/youtube/youtube.controller";

const youtubeRouter = express.Router();

youtubeRouter.get("/auth", youtubeAuth);
youtubeRouter.get("/callback", youtubeCallback);
youtubeRouter.get("/get-channel", getYoutubeChannelDetails);
youtubeRouter.post("/upload-video", uploadYoutubeVideo);

// Videos
youtubeRouter.post("/videos", getAllYoutubeVideos);

// Comments
youtubeRouter.post("/comments", getVideoComments);
youtubeRouter.post("/comments/add", addVideoComment);
youtubeRouter.post("/comments/reply", replyToYoutubeComment);

// Subscribers & Subscriptions
youtubeRouter.post("/subscribers", getSubscribers);
youtubeRouter.post("/subscribers/recent", getRecentSubscribers);
youtubeRouter.post("/subscriptions", getUserSubscriptions);

// Statistics
youtubeRouter.post("/video/stats", getVideoStatistics);
youtubeRouter.post("/channel/stats", getChannelStatistics);
youtubeRouter.get("/channel/get-all-details", getYoutubeAllDetails);

export default youtubeRouter;
