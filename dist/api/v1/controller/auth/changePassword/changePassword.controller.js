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
exports.changePassword = void 0;
const generateToken_service_1 = __importDefault(require("../../../../../services/generateToken/generateToken.service"));
const users_model_1 = __importDefault(require("../../../../../models/users/users.model"));
const hashPassword_1 = require("../../../../../services/passwordControl/hashPassword");
const changePassword = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { userId, newPassword } = req.body;
        const password = yield (0, hashPassword_1.hashPassword)(newPassword);
        const user = yield users_model_1.default.findOneAndUpdate({ email: userId }, { $set: { password } }, { new: true });
        const tokenPayload = {
            _id: String((user === null || user === void 0 ? void 0 : user._id) || ""),
            company_object_id: (user === null || user === void 0 ? void 0 : user.company_object_id)
                ? String(user.company_object_id)
                : "",
        };
        const token = (0, generateToken_service_1.default)(tokenPayload);
        return res.status(200).json({
            message: "Password changed successfully",
            result: Object.assign({}, user === null || user === void 0 ? void 0 : user.toObject()),
            token,
        });
    }
    catch (error) {
        return res.status(400).json({
            message: "Failed to change password",
            error,
        });
    }
});
exports.changePassword = changePassword;
