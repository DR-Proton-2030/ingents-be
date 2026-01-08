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

const storage = multer.memoryStorage();
const upload = multer({ storage });

// 🔑 AUTH
router.get("/facebook", facebookLogin);
router.get("/facebook/callback", facebookAuthCallback);

// 📄 PAGES
router.get("/facebook/get-pages", fetchFacebookPages);

// 🔐 TOKEN
router.patch("/facebook/get-long-live-token", getAccessTokenLongTerm);

// 📝 POST
router.post(
  "/facebook/post",
  upload.fields([
    { name: "image", maxCount: 1 },
    { name: "video", maxCount: 1 },
  ]),
  postFacebookUniversal
);

export default router;
