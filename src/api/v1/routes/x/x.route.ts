import express from "express";
import {
  getXAllDetails,
  xLogin,
  xAuthCallback,
  xRefreshToken,
  getXProfile,
} from "../../controller/x/x.controller";

const router = express.Router();

// X OAuth
router.get("/login", xLogin);
router.get("/callback", xAuthCallback);
router.get("/refresh-token", xRefreshToken);

// X profile (authenticated user)
router.get("/profile", getXProfile);

// Aggregated X (Twitter) handle details
router.get("/handle/get-all-details", getXAllDetails);

export default router;
