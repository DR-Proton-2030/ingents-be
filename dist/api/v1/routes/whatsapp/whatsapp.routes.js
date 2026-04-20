"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const whatsapp_controller_1 = require("../../controller/whatsapp/whatsapp.controller");
const userAuth_1 = require("../../middlewares/auth/userAuth");
const router = (0, express_1.Router)();
router.post("/connect", userAuth_1.userAuth, whatsapp_controller_1.connectWhatsapp);
router.post("/disconnect", userAuth_1.userAuth, whatsapp_controller_1.disconnectWhatsapp);
exports.default = router;
