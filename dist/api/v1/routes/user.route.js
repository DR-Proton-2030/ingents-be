"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const user_controller_1 = require("../controller/user/user.controller");
const userRouter = (0, express_1.Router)();
userRouter.patch("/update-user", user_controller_1.updateUser);
exports.default = userRouter;
