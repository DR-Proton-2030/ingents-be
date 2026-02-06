import express from "express";
import { getSocialMetrics } from "../../controller/social/social.controller";

const router = express.Router();

// Unified social metrics
router.get("/metrics", getSocialMetrics);

export default router;
