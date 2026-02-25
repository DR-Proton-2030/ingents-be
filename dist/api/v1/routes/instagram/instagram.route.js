"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const multer_1 = __importDefault(require("multer"));
const instagram_controller_1 = require("../../controller/instagram/instagram.controller");
const storage = multer_1.default.memoryStorage();
const upload = (0, multer_1.default)({ storage });
const instagramRouter = express_1.default.Router();
instagramRouter.get("/login-instagram", instagram_controller_1.instagramLogin);
instagramRouter.get("/callback", instagram_controller_1.instagramAuthCallback);
instagramRouter.get("/fetch-profile", instagram_controller_1.fetchInstagramProfileController);
// instagramRouter.post("/publish-universal-post", publishInstagramPost);
// Universal Instagram post
instagramRouter.post("/post", upload.fields([
    { name: "image", maxCount: 1 },
    { name: "video", maxCount: 1 },
]), instagram_controller_1.postInstagramUniversal);
instagramRouter.post("/disconnect", instagram_controller_1.disconnectInstagram);
exports.default = instagramRouter;
