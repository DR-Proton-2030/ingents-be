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
exports.disconnectWhatsapp = exports.connectWhatsapp = void 0;
const users_model_1 = __importDefault(require("../../../../models/users/users.model"));
const connectWhatsapp = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { _id: user_object_id } = req.user;
        const { phone_number_id, access_token, waba_id } = req.body;
        if (!phone_number_id || !access_token) {
            return res.status(400).json({ message: "Missing required WhatsApp credentials" });
        }
        const updatedUser = yield users_model_1.default.findByIdAndUpdate(user_object_id, {
            $set: {
                whatsapp: {
                    phone_number_id,
                    access_token,
                    waba_id: waba_id || null,
                },
            },
        }, { new: true });
        res.status(200).json({
            message: "WhatsApp connected successfully",
            data: {
                whatsapp: updatedUser === null || updatedUser === void 0 ? void 0 : updatedUser.whatsapp,
            },
        });
    }
    catch (error) {
        console.error("❌ Connect WhatsApp Error:", error);
        res.status(500).json({ message: "Internal server error" });
    }
});
exports.connectWhatsapp = connectWhatsapp;
const disconnectWhatsapp = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { _id: user_object_id } = req.user;
        yield users_model_1.default.findByIdAndUpdate(user_object_id, {
            $unset: { whatsapp: 1 },
        }, { new: true });
        res.status(200).json({ message: "WhatsApp disconnected successfully" });
    }
    catch (error) {
        console.error("❌ Disconnect WhatsApp Error:", error);
        res.status(500).json({ message: "Internal server error" });
    }
});
exports.disconnectWhatsapp = disconnectWhatsapp;
