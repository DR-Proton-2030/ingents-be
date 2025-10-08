import { Router } from "express";
import { userAuth } from "../../middlewares/auth/userAuth";
import { upload } from "../../middlewares/helper/multer/multer.middleware";
import { sendMessage } from "../../controller/chatController/message.controller";

const authRouter = Router();

authRouter.post("/create-user", userAuth, upload.fields([{ name: "profile_picture", maxCount: 1 }]), sendMessage);