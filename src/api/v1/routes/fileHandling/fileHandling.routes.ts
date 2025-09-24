import { Router } from "express";
import { upload } from "../../middlewares/helper/multer/multer.middleware";
import { userAuth } from "../../middlewares/auth/userAuth";
import { handleUploadedFile } from "../../controller/fileHandling/fileHandling.controller";

const fileHandleRouter = Router();
fileHandleRouter.post("/upload-excel-sheet",
    upload.single("file"),   ///MiddleWare to handle file upload
    userAuth,
    handleUploadedFile
);



export default fileHandleRouter;