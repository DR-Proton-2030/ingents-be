"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const youtube_controller_1 = require("../../controller/youtube/youtube.controller");
const youtubeRouter = express_1.default.Router();
youtubeRouter.get("/auth", youtube_controller_1.youtubeAuth);
youtubeRouter.get("/callback", youtube_controller_1.youtubeCallback);
youtubeRouter.get("/get-channel", youtube_controller_1.getYoutubeChannelDetails);
youtubeRouter.post("/upload-video", youtube_controller_1.uploadYoutubeVideo);
exports.default = youtubeRouter;
