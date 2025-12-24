"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const user_controller_1 = require("../../controller/user/user.controller");
const userAuth_1 = require("../../middlewares/auth/userAuth");
const userRouter = (0, express_1.Router)();
userRouter.post("/create-user", userAuth_1.userAuth, user_controller_1.createUser);
userRouter.patch("/update-user", userAuth_1.userAuth, user_controller_1.updateUser);
exports.default = userRouter;
