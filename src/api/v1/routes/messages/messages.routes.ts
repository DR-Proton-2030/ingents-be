import { Router } from "express";
import { userAuth } from "../../middlewares/auth/userAuth";
import { upload } from "../../middlewares/helper/multer/multer.middleware";
import { sendMessage } from "../../controller/chatController/message.controller";
import { fileUploadHelper } from "../../middlewares/helper/fileUpload.helper";

const messageRouter = Router();

messageRouter.post("/send",userAuth, upload.fields([{ name: "files", maxCount: 5 }]), fileUploadHelper, sendMessage);

export default messageRouter;