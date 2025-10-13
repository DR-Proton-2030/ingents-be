import express from "express";
import {
  facebookLogin,
  facebookAuthCallback,
  fetchFacebookPages,
  getAccessTokenLongTerm,
  postFacebookText,
  uploadFacebookVideo,
  postFacebookImage,
} from "../../controller/facebook/facebook.controller";

const router = express.Router();

router.get("/facebook", facebookLogin);
router.get("/callback", facebookAuthCallback);
router.get("/get-pages", fetchFacebookPages);
router.patch("/get-long-live-token", getAccessTokenLongTerm);
router.post("/post-text", postFacebookText);
router.post("/upload-video", uploadFacebookVideo);
router.post("/post-image", postFacebookImage);

export default router;
