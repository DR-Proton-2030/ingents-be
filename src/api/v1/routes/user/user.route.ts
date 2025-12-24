import { Router } from "express";
import { createUser, getUserById, getUsers, updateUser } from "../../controller/user/user.controller";
import { userAuth } from "../../middlewares/auth/userAuth";

const userRouter = Router();

userRouter.post("/create-user", userAuth, createUser);
userRouter.get("/get-user", userAuth, getUsers);
userRouter.get("/get-user-details/:id", getUserById);
userRouter.patch("/update-user", userAuth, updateUser);

export default userRouter;
