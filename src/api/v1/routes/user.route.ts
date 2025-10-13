import { Router } from "express";
import { updateUser } from "../controller/user/user.controller";

const userRouter = Router();

userRouter.patch("/update-user", updateUser);

export default userRouter;
