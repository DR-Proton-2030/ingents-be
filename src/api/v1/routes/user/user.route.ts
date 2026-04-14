import { Router } from "express";
import { createUser, getUserById, getUsers, searchUsers, updateUser, markAttendance, getAttendanceStats } from "../../controller/user/user.controller";
import { userAuth } from "../../middlewares/auth/userAuth";

const userRouter = Router();

userRouter.post("/create-user", userAuth, createUser);
userRouter.get("/get-user", userAuth, getUsers);
userRouter.get("/get-user-details/:id", getUserById);
userRouter.patch("/update-user", userAuth, updateUser);
userRouter.get("/search-users", userAuth, searchUsers);
userRouter.post("/mark-attendance", userAuth, markAttendance);
userRouter.get("/attendance-stats", userAuth, getAttendanceStats);

export default userRouter;
