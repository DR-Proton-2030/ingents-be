import express from "express";
import {
  youtubeAuth,
  youtubeCallback,
  getYoutubeChannelDetails,
  uploadYoutubeVideo,
} from "../../controller/youtube/youtube.controller";

const youtubeRouter = express.Router();

youtubeRouter.get("/auth", youtubeAuth);
youtubeRouter.get("/callback", youtubeCallback);
youtubeRouter.get("/get-channel", getYoutubeChannelDetails);
youtubeRouter.post("/upload-video", uploadYoutubeVideo);

export default youtubeRouter;
