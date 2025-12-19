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
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateUser = void 0;
const users_model_1 = __importDefault(require("../../../../models/users/users.model"));
const updateUser = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const _a = req.body, { userId } = _a, payload = __rest(_a, ["userId"]);
        if (!userId) {
            return res.status(400).json({ message: "Missing userId" });
        }
        // Fetch existing user to merge nested objects
        const existingUser = yield users_model_1.default.findById(userId);
        if (!existingUser) {
            return res.status(404).json({ message: "User not found" });
        }
        // Merge nested objects like facebook, instagram, etc.
        for (const key of Object.keys(payload)) {
            if (typeof payload[key] === "object" &&
                payload[key] !== null &&
                existingUser[key] &&
                typeof existingUser[key] === "object") {
                const existingVal = existingUser[key];
                payload[key] = Object.assign(Object.assign({}, (existingVal && existingVal.toObject
                    ? existingVal.toObject()
                    : existingVal)), payload[key]);
            }
        }
        const updatedUser = yield users_model_1.default.findByIdAndUpdate(userId, { $set: payload }, { new: true });
        return res.status(200).json({
            message: "User updated successfully",
            result: updatedUser,
        });
    }
    catch (error) {
        console.error("Update failed:", error);
        return res
            .status(500)
            .json({ message: "User update failed", error: error.message });
    }
});
exports.updateUser = updateUser;
