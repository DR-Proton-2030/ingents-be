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
exports.searchUsers = exports.getUserById = exports.getUsers = exports.createUser = exports.updateUser = exports.getAttendanceStats = exports.checkAttendance = exports.markAttendance = void 0;
const mongoose_1 = require("mongoose");
const users_model_1 = __importDefault(require("../../../../models/users/users.model"));
const attendance_model_1 = __importDefault(require("../../../../models/attendance/attendance.model"));
const hashPassword_1 = require("../../../../services/passwordControl/hashPassword");
const markAttendance = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const user_id = req.user._id;
        const { company_object_id } = req.user;
        // Get current date string in YYYY-MM-DD
        const today = new Date().toISOString().split("T")[0];
        const existingAttendance = yield attendance_model_1.default.findOne({
            user_object_id: user_id,
            date: today,
        });
        if (!existingAttendance) {
            yield attendance_model_1.default.create({
                user_object_id: user_id,
                company_object_id,
                date: today,
            });
        }
        return res.status(200).json({
            message: "Attendance marked successfully",
        });
    }
    catch (error) {
        console.error("markAttendance failed:", error);
        return res
            .status(500)
            .json({ message: "Marking attendance failed", error: error.message });
    }
});
exports.markAttendance = markAttendance;
const checkAttendance = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const user_id = req.user._id;
        const today = new Date().toISOString().split("T")[0];
        const existingAttendance = yield attendance_model_1.default.findOne({
            user_object_id: user_id,
            date: today,
        });
        return res.status(200).json({
            hasAttended: !!existingAttendance
        });
    }
    catch (error) {
        console.error("checkAttendance failed:", error);
        return res
            .status(500)
            .json({ message: "Checking attendance failed", error: error.message });
    }
});
exports.checkAttendance = checkAttendance;
const getAttendanceStats = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { company_object_id } = req.user;
        const totalUsers = yield users_model_1.default.countDocuments({ company_object_id, has_joined: true });
        const now = new Date();
        const startOfCurrentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const startOfPrevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const endOfPrevMonth = new Date(now.getFullYear(), now.getMonth(), 0);
        // Current month attendances
        const currentAttendances = yield attendance_model_1.default.find({
            company_object_id,
            createdAt: { $gte: startOfCurrentMonth }
        });
        // Previous month attendances (for percentage calculation)
        const prevAttendances = yield attendance_model_1.default.find({
            company_object_id,
            createdAt: { $gte: startOfPrevMonth, $lte: endOfPrevMonth }
        });
        // 5 Weeks x 7 Days grid
        const rawGridCounts = Array.from({ length: 5 }, () => Array(7).fill(0));
        currentAttendances.forEach(att => {
            const date = att.createdAt;
            if (!date)
                return;
            const dayOfMonth = date.getDate();
            const dayOfWeek = date.getDay(); // 0-6
            // Calculate week index (roughly)
            // We'll use: Math.floor((dayOfMonth - 1 + startOfCurrentMonth.getDay()) / 7)
            const firstDayOffset = startOfCurrentMonth.getDay();
            const weekIndex = Math.floor((dayOfMonth - 1 + firstDayOffset) / 7);
            if (weekIndex < 5) {
                rawGridCounts[weekIndex][dayOfWeek] += 1;
            }
        });
        const gridData = [];
        for (let r = 0; r < 5; r++) {
            const rowArr = [];
            for (let c = 0; c < 7; c++) {
                const count = rawGridCounts[r][c];
                let intensity = 0;
                if (totalUsers > 0 && count > 0) {
                    const percent = count / totalUsers;
                    if (percent <= 0.25)
                        intensity = 1;
                    else if (percent <= 0.50)
                        intensity = 2;
                    else if (percent <= 0.75)
                        intensity = 3;
                    else
                        intensity = 4;
                }
                rowArr.push({ count, intensity });
            }
            gridData.push(rowArr);
        }
        // Calculate percentage change
        const currentAvg = totalUsers > 0 ? currentAttendances.length / (totalUsers * now.getDate()) : 0;
        const prevAvg = totalUsers > 0 ? prevAttendances.length / (totalUsers * endOfPrevMonth.getDate()) : 0;
        let overallPercentage = 0;
        if (prevAvg > 0) {
            overallPercentage = Math.round(((currentAvg - prevAvg) / prevAvg) * 100);
        }
        else if (currentAvg > 0) {
            overallPercentage = 100;
        }
        return res.status(200).json({
            data: {
                gridData,
                overallPercentage
            }
        });
    }
    catch (error) {
        console.error("getAttendanceStats failed:", error);
        return res.status(500).json({ message: "Failed to fetch stats", error: error.message });
    }
});
exports.getAttendanceStats = getAttendanceStats;
const updateUser = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const _a = req.body, { userId } = _a, payload = __rest(_a, ["userId"]);
        if (!userId) {
            return res.status(400).json({ message: "Missing userId" });
        }
        if (payload.password) {
            payload.password = yield (0, hashPassword_1.hashPassword)(payload.password);
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
        const { email, role, full_name, password } = req.body;
        const { company_object_id } = req.user;
        if (!company_object_id) {
            return res.status(400).json({ message: "Company ID is required" });
        }
        const existingUser = yield users_model_1.default.findOne({ email: email });
        if (existingUser)
            return res.status(400).json({
                message: "User with this email already exists",
            });
        const userPayload = Object.assign({ email,
            role,
            full_name, has_joined: false, company_object_id: new mongoose_1.Types.ObjectId(company_object_id) }, (password ? { password: yield (0, hashPassword_1.hashPassword)(password) } : {}));
        const userInstance = yield new users_model_1.default(userPayload).save();
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
