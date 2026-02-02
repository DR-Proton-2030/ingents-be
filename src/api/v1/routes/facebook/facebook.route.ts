import express from "express";
import multer from "multer";
import {
  facebookLogin,
  facebookAuthCallback,
  fetchFacebookPages,
  getAccessTokenLongTerm,
  postFacebookUniversal,
  getFacebookAllDetails,
} from "../../controller/facebook/facebook.controller";

const router = express.Router();

const storage = multer.memoryStorage();
const upload = multer({ storage });

// 🔑 AUTH
router.get("/login", facebookLogin);
router.get("/callback", facebookAuthCallback);

// 📄 PAGES
router.get("/get-pages", fetchFacebookPages);

// 🔐 TOKEN
router.patch("/facebook/get-long-live-token", getAccessTokenLongTerm);

// 📝 POST
router.post(
  "/post",
  upload.fields([
    { name: "image", maxCount: 1 },
    { name: "video", maxCount: 1 },
  ]),
  postFacebookUniversal,
);

//  Aggregated Page Details
router.get("/page/get-all-details", getFacebookAllDetails);

export default router;
