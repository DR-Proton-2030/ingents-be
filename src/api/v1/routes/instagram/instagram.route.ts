import expres from "express";
import {
  instagramAuthCallback,
  instagrmaLogin,
} from "../../controller/instagram/instagram.controller";

const instagramRouter = expres.Router();

instagramRouter.get("/login-instagram", instagrmaLogin);
instagramRouter.get("/callback", instagramAuthCallback);

export default instagramRouter;
