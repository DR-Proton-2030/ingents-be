"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const social_controller_1 = require("../../controller/social/social.controller");
const router = express_1.default.Router();
// Unified social metrics
router.get("/metrics", social_controller_1.getSocialMetrics);
// Sync platform data
router.get("/sync/youtube", social_controller_1.syncYoutube);
router.get("/sync/facebook", social_controller_1.syncFacebook);
router.get("/sync/instagram", social_controller_1.syncInstagram);
// Get dashboard data from database
router.get("/youtube/dashboard-data", social_controller_1.getYoutubeDashboard);
router.get("/facebook/dashboard-data", social_controller_1.getFacebookDashboard);
router.get("/instagram/dashboard-data", social_controller_1.getInstagramDashboard);
exports.default = router;
