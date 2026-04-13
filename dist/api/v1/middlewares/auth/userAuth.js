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
exports.userAuth = void 0;
const verifyToken_service_1 = require("../../../../services/verifyToken/verifyToken.service");
const users_model_1 = __importDefault(require("../../../../models/users/users.model"));
const userAuth = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    const token = ((_a = req.cookies) === null || _a === void 0 ? void 0 : _a.token) || ((_b = req.header("Authorization")) === null || _b === void 0 ? void 0 : _b.replace("Bearer ", ""));
    if (!token) {
        res.status(401).json({ message: "Unauthorized" });
        return;
    }
    try {
        const decoded = (0, verifyToken_service_1.verifyToken)(token);
        if (!decoded) {
            // Note: verifyToken already logs the specific error (expired vs invalid)
            res.status(401).json({ message: "Unauthorized: Invalid or expired token" });
            return;
        }
        if (!decoded.full_name && decoded._id) {
            const user = yield users_model_1.default.findById(decoded._id).select("full_name").lean();
            req.user = Object.assign(Object.assign({}, decoded), { full_name: (user === null || user === void 0 ? void 0 : user.full_name) || "Unknown" });
        }
        else {
            req.user = decoded;
        }
        next();
    }
    catch (error) {
        console.error("userAuth error:", error);
        res.status(401).json({ message: "Unauthorized" });
        return;
    }
});
exports.userAuth = userAuth;
