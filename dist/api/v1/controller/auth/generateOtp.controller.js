"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateOtp = void 0;
const users_model_1 = __importDefault(require("../../../../models/users/users.model"));
const callMailServer_1 = require("../../../../services/callMailServer/callMailServer");
const generateOtp = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { email, type } = req.body;
        const user = yield users_model_1.default.findOne({
            email: { $regex: `^${email}$`, $options: "i" },
        });
        const otp = Math.floor(1000 + Math.random() * 9000).toString();
        if (type === "password-change") {
            if (!user) {
                return res.status(404).json({
                    message: "Email not found",
                });
            }
            yield (0, callMailServer_1.callMailServer)("forgotten-password", {
                email,
                otpCode: otp,
                userName: user.full_name || "User",
                resetUrl: "test.com"
            });
        }
        else {
            if (user) {
                return res.status(409).json({
                    message: "Email already exists",
                });
            }
            yield (0, callMailServer_1.callMailServer)("signup-otp", {
                email,
                otpCode: otp,
            });
        }
        // Email sending skipped for now
        return res.status(200).json({
            message: "OTP generated successfully",
            result: otp,
            userId: (user === null || user === void 0 ? void 0 : user._id) || null,
        });
    }
    catch (error) {
        console.error("Error in sendOtp:", error);
        return res.status(400).json({
            message: "Failed to generate OTP",
        });
    }
});
exports.generateOtp = generateOtp;
