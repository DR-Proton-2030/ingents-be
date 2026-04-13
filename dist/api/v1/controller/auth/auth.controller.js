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
exports.setupPassword = exports.logoutUser = exports.getUsersByClientId = exports.verifyToken = exports.signIn = exports.signUp = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const company_model_1 = __importDefault(require("../../../../models/company/company.model"));
const users_model_1 = __importDefault(require("../../../../models/users/users.model"));
const generateToken_service_1 = __importDefault(require("../../../../services/generateToken/generateToken.service"));
const hashPassword_1 = require("../../../../services/passwordControl/hashPassword");
const comparePassword_1 = require("../../../../services/passwordControl/comparePassword");
const config_1 = require("../../../../config/config");
const companyEmbeddings_service_1 = require("../../../../services/companyEmbeddings/companyEmbeddings.service");
const createDefaultTaskPhases_1 = require("../../../../services/taskPhase/createDefaultTaskPhases");
const signUp = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    console.log("=========> Req Body:", req.body);
    const session = yield mongoose_1.default.startSession();
    session.startTransaction();
    try {
        const user_details = typeof req.body.user_details === "string"
            ? JSON.parse(req.body.user_details)
            : req.body.user_details;
        const company_details = typeof req.body.company_details === "string"
            ? JSON.parse(req.body.company_details)
            : req.body.company_details;
        const { user_avatar, company_logo } = req.body;
        const userExists = yield users_model_1.default.findOne({
            email: user_details.email,
        }).session(session);
        if (userExists) {
            yield session.abortTransaction();
            session.endSession();
            return res.status(409).json({ message: "User already exists" });
        }
        console.log("===>Logo", company_logo);
        const companyPayload = Object.assign(Object.assign({}, company_details), { logo: company_logo || null });
        const companyInstance = yield new company_model_1.default(companyPayload).save({
            session,
        });
        const userPayload = Object.assign(Object.assign({}, user_details), { password: yield (0, hashPassword_1.hashPassword)(user_details.password), company_object_id: companyInstance._id, profile_picture: user_avatar || null });
        const userInstance = yield new users_model_1.default(userPayload).save({ session });
        // Create default task phases for the company
        yield (0, createDefaultTaskPhases_1.createDefaultTaskPhases)({
            company_object_id: new mongoose_1.default.Types.ObjectId(companyInstance._id),
            session,
        });
        // Generate company embeddings for RAG functionality
        try {
            console.log("Generating company embeddings...");
            yield companyEmbeddings_service_1.CompanyEmbeddingsService.createCompanyEmbeddings({
                company: companyInstance.toObject(),
                additionalContext: [
                    `Primary contact: ${user_details.full_name} (${user_details.email})`,
                    `User role: ${user_details.role || "Administrator"}`,
                    `Registration date: ${new Date().toISOString()}`,
                ],
            }, session);
            console.log("Company embeddings generated successfully");
        }
        catch (embeddingError) {
            console.error("Error generating company embeddings:", embeddingError);
            // Don't fail the signup if embeddings fail, but log the error
            // You might want to implement a retry mechanism or background job here
        }
        yield session.commitTransaction();
        session.endSession();
        // await callMailServer("welcome", {
        //   email: user_details.email,
        //   userName: user_details.full_name || "There",
        // });
        const tokenPayload = {
            company_object_id: String(companyInstance._id),
            _id: String(userInstance._id),
            role: "user",
            full_name: user_details.full_name,
        };
        const token = (0, generateToken_service_1.default)(tokenPayload);
        res.cookie("token", token, {
            httpOnly: true, // Prevents JavaScript access (XSS protection)
            secure: config_1.NODE_ENV === "production", // Use secure cookies in production
            sameSite: config_1.NODE_ENV === "production" ? "none" : "lax",
            path: "/", // Makes cookie accessible across the entire app
            maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days expiration
            domain: config_1.NODE_ENV === "production" ? ".ingents.ai" : "localhost", // Set domain for production
        });
        const userDetails = Object.assign(Object.assign({}, userInstance.toObject()), { company_details: companyInstance.toObject() });
        return res.status(200).json({
            message: "User created successfully",
            data: { user: userDetails, token },
        });
    }
    catch (error) {
        console.error("SignUp error:", error);
        if (session.inTransaction()) {
            yield session.abortTransaction();
        }
        session.endSession();
        return res.status(500).json({ message: "Something went wrong", error });
    }
});
exports.signUp = signUp;
const signIn = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { email, password } = req.body;
        // 1️⃣ Find user
        const user = yield users_model_1.default.findOne({ email }).populate("company_details");
        if (!user) {
            return res.status(404).json({
                message: "User not found",
            });
        }
        // 🔴 IMPORTANT: password not set (invited user)
        if (!user.password) {
            return res.status(400).json({
                message: "Please set your password first",
                code: "PASSWORD_NOT_SET",
                redirect: "/setup-password",
            });
        }
        // 2️⃣ Validate password (SAFE now)
        const isMatchPassword = yield (0, comparePassword_1.comparePassword)(password, user.password);
        if (!isMatchPassword) {
            return res.status(401).json({
                message: "Wrong password",
            });
        }
        // 3️⃣ Generate token
        const tokenPayload = {
            company_object_id: String(user.company_object_id),
            _id: String(user._id),
            role: user.role || "user",
            full_name: user.full_name,
        };
        const token = (0, generateToken_service_1.default)(tokenPayload);
        // 4️⃣ Sanitize user object
        const userObj = user.toObject();
        delete userObj.password;
        // 5️⃣ Set cookie (FIXED)
        res.cookie("token", token, Object.assign({ httpOnly: true, secure: config_1.NODE_ENV === "production", sameSite: config_1.NODE_ENV === "production" ? "none" : "strict", path: "/", maxAge: 7 * 24 * 60 * 60 * 1000 }, (config_1.NODE_ENV === "production" && { domain: ".ingents.ai" })));
        // 6️⃣ Response
        return res.status(200).json({
            message: "User logged in successfully",
            data: {
                user: Object.assign(Object.assign({}, userObj), { has_joined: user.has_joined }),
            },
        });
    }
    catch (error) {
        console.error("Sign in error:", error);
        return res.status(500).json({
            message: "Something went wrong",
        });
    }
});
exports.signIn = signIn;
const verifyToken = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { _id, company_object_id } = req.user;
        console.log("user", _id, company_object_id);
        const user = yield users_model_1.default.findById(_id).populate("company_details");
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }
        return res.status(200).json({
            message: "Token verified successfully",
            data: {
                user,
            },
        });
    }
    catch (error) {
        return res.status(400).json({ message: "Something went wrong", error });
    }
});
exports.verifyToken = verifyToken;
const getUsersByClientId = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { clientId } = req.params;
        if (!clientId) {
            return res.status(400).json({ message: "Client ID is required" });
        }
        const users = yield users_model_1.default.find({ client_object_id: clientId });
        return res.status(200).json({
            message: "Users fetched successfully",
            data: users,
        });
    }
    catch (error) {
        console.error("Error fetching users by clientId:", error);
        return res.status(500).json({ message: "Something went wrong", error });
    }
});
exports.getUsersByClientId = getUsersByClientId;
const logoutUser = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        res.clearCookie("token", {
            httpOnly: true, // Prevents JavaScript access (XSS protection)
            secure: config_1.NODE_ENV === "production", // Use secure cookies in production
            sameSite: config_1.NODE_ENV === "production" ? "none" : "strict",
            path: "/", // Makes cookie accessible across the entire app
            domain: config_1.NODE_ENV === "production" ? ".ingents.ai" : "localhost",
        });
        res.status(200).json({
            message: "User logged out successfully",
        });
    }
    catch (error) {
        console.error("Logout error:", error);
        res.status(500).json({
            message: "Internal server error",
        });
    }
});
exports.logoutUser = logoutUser;
const setupPassword = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { newPassword } = req.body;
        const { _id } = req.user;
        const hashedPassword = yield (0, hashPassword_1.hashPassword)(newPassword);
        yield users_model_1.default.findByIdAndUpdate(_id, {
            $set: { password: hashedPassword, has_joined: true },
        });
        return res.status(200).json({
            message: "Password setup successfully for all users in the company",
        });
    }
    catch (error) {
        console.error("Error setting up password:", error);
        return res.status(500).json({ message: "Something went wrong", error });
    }
});
exports.setupPassword = setupPassword;
