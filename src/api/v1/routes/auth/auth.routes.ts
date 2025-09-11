import { Router } from "express";
import { userAuth } from "../../middlewares/auth/userAuth";
import { createUser, getUsers, getUsersByClientId, logoutUser, signIn, signUp, verifyToken } from "../../controller/auth/auth.controller";
import { fileUploadHelper } from "../../middlewares/helper/fileUpload.helper";
import { upload } from "../../middlewares/helper/multer/multer.middleware";
import { changePassword } from "../../controller/auth/changePassword/changePassword.controller";
import { googleSignUp } from "../../controller/auth/googleAuth.controller";
import { generateOtp } from "../../controller/auth/generateOtp.controller";

const authRouter = Router();
authRouter.post("/signup", upload.fields([{ name: "company_logo", maxCount: 1 }, { name: "user_avatar", maxCount: 1 }]), fileUploadHelper, signUp);
authRouter.post("/create-user", userAuth, upload.fields([{ name: "profile_picture", maxCount: 1 }]), fileUploadHelper, createUser);
authRouter.get("/get-user", userAuth, getUsers);
authRouter.get("/get-user/:clientId", userAuth, getUsersByClientId);
authRouter.post("/google-signup", googleSignUp);
authRouter.post("/login", signIn);
authRouter.post("/verify-token", userAuth, verifyToken);
authRouter.post("/get-otp", generateOtp);
authRouter.patch("/change-password", changePassword);
authRouter.route("/logout").post(userAuth, logoutUser);

export default authRouter;
