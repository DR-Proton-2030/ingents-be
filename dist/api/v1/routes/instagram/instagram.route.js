"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const instagram_controller_1 = require("../../controller/instagram/instagram.controller");
const instagramRouter = express_1.default.Router();
instagramRouter.get("/login-instagram", instagram_controller_1.instagrmaLogin);
instagramRouter.get("/callback", instagram_controller_1.instagramAuthCallback);
instagramRouter.get("/fetch-profile", instagram_controller_1.fetchInstagramProfileController);
instagramRouter.post("/publish-post", instagram_controller_1.publishInstagramPost);
instagramRouter.post("/disconnect", instagram_controller_1.disconnectInstagram);
exports.default = instagramRouter;
