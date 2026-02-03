import express from "express";
import multer from "multer";
import {
  getXAllDetails,
  xLogin,
  xAuthCallback,
  xRefreshToken,
  getXProfile,
  postXUniversal,
} from "../../controller/x/x.controller";

const router = express.Router();
const storage = multer.memoryStorage();
const upload = multer({ storage });

// X OAuth
router.get("/login", xLogin);
router.get("/callback", xAuthCallback);
router.get("/refresh-token", xRefreshToken);

// X profile (authenticated user)
router.get("/profile", getXProfile);

// Aggregated X (Twitter) handle details
router.get("/handle/get-all-details", getXAllDetails);

// X post
router.post(
  "/post",
  upload.fields([
    { name: "image", maxCount: 1 },
    { name: "video", maxCount: 1 },
  ]),
  postXUniversal,
);

export default router;
