import { Router } from "express";
import { createUser, getUserById, getUsers, searchUsers, updateUser } from "../../controller/user/user.controller";
import { userAuth } from "../../middlewares/auth/userAuth";

const userRouter = Router();

userRouter.post("/create-user", userAuth, createUser);
userRouter.get("/get-user", userAuth, getUsers);
userRouter.get("/get-user-details/:id", getUserById);
userRouter.patch("/update-user", userAuth, updateUser);
userRouter.get("/search-users", userAuth, searchUsers);

export default userRouter;
