"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const waitList_controller_1 = require("../../controller/waitList/waitList.controller");
const waitListRouter = (0, express_1.Router)();
waitListRouter.post("/create", waitList_controller_1.createWaitList);
exports.default = waitListRouter;
