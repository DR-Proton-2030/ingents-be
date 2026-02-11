"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const multer_1 = __importDefault(require("multer"));
const x_controller_1 = require("../../controller/x/x.controller");
const router = express_1.default.Router();
const storage = multer_1.default.memoryStorage();
const upload = (0, multer_1.default)({ storage });
// X OAuth
router.get("/login", x_controller_1.xLogin);
router.get("/callback", x_controller_1.xAuthCallback);
router.get("/refresh-token", x_controller_1.xRefreshToken);
// X profile (authenticated user)
router.get("/profile", x_controller_1.getXProfile);
// Aggregated X (Twitter) handle details
router.get("/handle/get-all-details", x_controller_1.getXAllDetails);
// X post
router.post("/post", upload.fields([
    { name: "image", maxCount: 1 },
    { name: "video", maxCount: 1 },
]), x_controller_1.postXUniversal);
// Disconnect X (Twitter)
router.post("/disconnect", x_controller_1.disconnectX);
exports.default = router;
