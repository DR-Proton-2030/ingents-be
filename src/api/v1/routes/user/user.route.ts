import { Router } from "express";
import { createUser, updateUser } from "../../controller/user/user.controller";
import { userAuth } from "../../middlewares/auth/userAuth";

const userRouter = Router();

userRouter.post("/create-user", userAuth, createUser);
userRouter.patch("/update-user", userAuth, updateUser);

export default userRouter;
