import express from "express";
import multer from "multer";
import {
  fetchInstagramProfileController,
  instagramAuthCallback,
  instagramLogin,
  publishInstagramPost,
  postInstagramUniversal,
  disconnectInstagram,
  getSinglePostAnalytics,
} from "../../controller/instagram/instagram.controller";

const storage = multer.memoryStorage();
const upload = multer({ storage });

const instagramRouter = express.Router();

instagramRouter.get("/login-instagram", instagramLogin);
instagramRouter.get("/callback", instagramAuthCallback);
instagramRouter.get("/fetch-profile", fetchInstagramProfileController);
// instagramRouter.post("/publish-universal-post", publishInstagramPost);

// Universal Instagram post
instagramRouter.post(
  "/post",
  upload.fields([
    { name: "image", maxCount: 1 },
    { name: "video", maxCount: 1 },
  ]),
  postInstagramUniversal,
);

instagramRouter.post("/disconnect", disconnectInstagram);
instagramRouter.get("/post/:postId/analytics", getSinglePostAnalytics);

export default instagramRouter;
