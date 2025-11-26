import { Router } from "express";
import { userAuth } from "../../middlewares/auth/userAuth";
import { upload } from "../../middlewares/helper/multer/multer.middleware";
import { sendMessage } from "../../controller/chatController/message.controller";

const messageRouter = Router();

messageRouter.post("/send",userAuth, upload.single("file"), sendMessage);

export default messageRouter;