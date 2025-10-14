import expres from "express";
import {
  fetchInstagramProfileController,
  instagramAuthCallback,
  instagrmaLogin,
  publishInstagramPost,
} from "../../controller/instagram/instagram.controller";

const instagramRouter = expres.Router();

instagramRouter.get("/login-instagram", instagrmaLogin);
instagramRouter.get("/callback", instagramAuthCallback);
instagramRouter.get("/fetch-profile", fetchInstagramProfileController);
instagramRouter.post("/publish-post", publishInstagramPost);

export default instagramRouter;
