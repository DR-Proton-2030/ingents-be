import express from "express";
import {
  youtubeAuth,
  youtubeCallback,
  disconnectYoutube,
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
  deleteYoutubeVideo,
} from "../../controller/youtube/youtube.controller";

import { upload } from "../../middlewares/helper/multer/multer.middleware";

const youtubeRouter = express.Router();

youtubeRouter.get("/auth", youtubeAuth);
youtubeRouter.get("/callback", youtubeCallback);
youtubeRouter.get("/get-channel", getYoutubeChannelDetails);
youtubeRouter.post("/disconnect", disconnectYoutube);
youtubeRouter.post("/upload-video", upload.single("video"), uploadYoutubeVideo);

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

// Delete video
youtubeRouter.post("/video/delete", deleteYoutubeVideo);

export default youtubeRouter;
