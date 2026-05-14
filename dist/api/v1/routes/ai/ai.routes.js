"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const ai_controller_1 = require("../../controller/ai/ai.controller");
const router = (0, express_1.Router)();
router.post("/generate", ai_controller_1.generateContent);
exports.default = router;
