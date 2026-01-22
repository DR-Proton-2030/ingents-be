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
exports.searchUsers = exports.getUserById = exports.getUsers = exports.createUser = exports.updateUser = void 0;
const users_model_1 = __importDefault(require("../../../../models/users/users.model"));
const generateToken_service_1 = __importDefault(require("../../../../services/generateToken/generateToken.service"));
const config_1 = require("../../../../config/config");
const callMailServer_1 = require("../../../../services/callMailServer/callMailServer");
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
const createUser = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { email, role, full_name } = req.body;
        const { company_object_id } = req.user;
        if (!company_object_id) {
            return res.status(400).json({ message: "Company ID is required" });
        }
        const existingUser = yield users_model_1.default.findOne({ email: email });
        if (existingUser)
            return res.status(400).json({
                message: "User with this email already exists",
            });
        const userPayload = {
            email,
            role,
            full_name,
            has_joined: false,
            company_object_id,
        };
        const userInstance = yield new users_model_1.default(userPayload).save();
        const tokenPayload = {
            _id: userInstance._id.toString(),
            role,
            company_object_id: company_object_id.toString()
        };
        const token = (0, generateToken_service_1.default)(tokenPayload);
        const resetUrl = `${config_1.FRONTEND_URL}/setup-password?token=${token}`;
        yield (0, callMailServer_1.callMailServer)("invite-user", {
            email,
            user_name: full_name || "User",
            password_setup_url: resetUrl
        });
        return res.status(200).json({
            message: "Client user created successfully",
            data: userInstance,
        });
    }
    catch (error) {
        console.log("====> createClientUser error:", error);
        return res.status(500).json({ message: "Something went wrong", error });
    }
});
exports.createUser = createUser;
const getUsers = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { company_object_id } = req.user;
        if (!company_object_id) {
            return res.status(400).json({ message: "Company ID not found in user" });
        }
        const users = yield users_model_1.default.find({ company_object_id, has_joined: true });
        return res.status(200).json({
            message: "Users fetched successfully",
            data: users,
        });
    }
    catch (error) {
        console.error("Error fetching users:", error);
        return res.status(500).json({ message: "Something went wrong", error });
    }
});
exports.getUsers = getUsers;
const getUserById = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params; // get user ID from URL
        if (!id) {
            return res.status(400).json({ message: "User ID is required" });
        }
        const user = yield users_model_1.default.findById(id);
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }
        return res.status(200).json({
            message: "User fetched successfully",
            data: user,
        });
    }
    catch (error) {
        console.error("Error fetching user:", error);
        return res.status(500).json({ message: "Something went wrong", error });
    }
});
exports.getUserById = getUserById;
const searchUsers = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { query = "" } = req.query;
        const { company_object_id } = req.user;
        const safeQuery = typeof query === "string"
            ? query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
            : "";
        const filter = {
            company_object_id,
        };
        if (safeQuery) {
            filter.$or = [
                { full_name: { $regex: `^${safeQuery}`, $options: "i" } },
                { email: { $regex: `^${safeQuery}`, $options: "i" } },
            ];
        }
        const users = yield users_model_1.default.find(filter)
            .select("_id full_name email role")
            .limit(20)
            .lean();
        return res.status(200).json({ data: users });
    }
    catch (error) {
        console.error("Search users error:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
});
exports.searchUsers = searchUsers;
