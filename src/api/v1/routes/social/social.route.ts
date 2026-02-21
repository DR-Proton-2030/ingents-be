import express from "express";
import { getSocialMetrics, syncYoutube, syncFacebook, syncInstagram, getYoutubeDashboard, getFacebookDashboard, getInstagramDashboard } from "../../controller/social/social.controller";

const router = express.Router();

// Unified social metrics
router.get("/metrics", getSocialMetrics);

// Sync platform data
router.get("/sync/youtube", syncYoutube);
router.get("/sync/facebook", syncFacebook);
router.get("/sync/instagram", syncInstagram);

// Get dashboard data from database
router.get("/youtube/dashboard-data", getYoutubeDashboard);
router.get("/facebook/dashboard-data", getFacebookDashboard);
router.get("/instagram/dashboard-data", getInstagramDashboard);

export default router;
