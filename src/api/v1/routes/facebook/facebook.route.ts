import express from "express";
import multer from "multer";
import {
  facebookLogin,
  facebookAuthCallback,
  fetchFacebookPages,
  getAccessTokenLongTerm,
  postFacebookUniversal,
} from "../../controller/facebook/facebook.controller";

const router = express.Router();

// Use memory storage so we can forward the file buffer directly to Facebook
const storage = multer.memoryStorage();
const upload = multer({ storage });

router.get("/facebook", facebookLogin);
router.get("/callback", facebookAuthCallback);
router.get("/get-pages", fetchFacebookPages);
router.patch("/get-long-live-token", getAccessTokenLongTerm);

router.post("/post", upload.fields([{ name: "image", maxCount: 1 }, { name: "video", maxCount: 1 }]), postFacebookUniversal);

export default router;
