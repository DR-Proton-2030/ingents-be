"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const activityLog_controller_1 = require("../../controller/activityLog/activityLog.controller");
const userAuth_1 = require("../../middlewares/auth/userAuth");
const activityLogRouter = (0, express_1.Router)();
activityLogRouter.get("/get-activities", userAuth_1.userAuth, activityLog_controller_1.getActivities);
exports.default = activityLogRouter;
