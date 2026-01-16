"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const multer_1 = __importDefault(require("multer"));
const facebook_controller_1 = require("../../controller/facebook/facebook.controller");
const router = express_1.default.Router();
const storage = multer_1.default.memoryStorage();
const upload = (0, multer_1.default)({ storage });
// 🔑 AUTH
router.get("/login", facebook_controller_1.facebookLogin);
router.get("/callback", facebook_controller_1.facebookAuthCallback);
// 📄 PAGES
router.get("/get-pages", facebook_controller_1.fetchFacebookPages);
// 🔐 TOKEN
router.patch("/facebook/get-long-live-token", facebook_controller_1.getAccessTokenLongTerm);
// 📝 POST
router.post("/post", upload.fields([
    { name: "image", maxCount: 1 },
    { name: "video", maxCount: 1 },
]), facebook_controller_1.postFacebookUniversal);
exports.default = router;
