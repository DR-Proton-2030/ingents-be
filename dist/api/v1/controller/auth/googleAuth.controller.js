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
exports.googleAuthCallback = exports.googleAuth = exports.googleSignUp = void 0;
const users_model_1 = __importDefault(require("../../../../models/users/users.model"));
const company_model_1 = __importDefault(require("../../../../models/company/company.model"));
const generateToken_service_1 = __importDefault(require("../../../../services/generateToken/generateToken.service"));
const googleapis_1 = require("googleapis");
const config_1 = require("../../../../config/config");
const GoogleAuth_1 = require("../../../../services/googleAuth/GoogleAuth");
const authToken_model_1 = __importDefault(require("../../../../models/authToken/authToken.model"));
const oauth2Client = new googleapis_1.google.auth.OAuth2(config_1.GOOGLE_CLIENT_ID, config_1.GOOGLE_CLIENT_SECRET, config_1.REDIRECT_URI);
const googleSignUp = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { user_details } = req.body;
        const userExists = yield users_model_1.default.findOne({ email: user_details.email });
        if (userExists) {
            const companyInstance = yield company_model_1.default.findById(userExists.company_object_id);
            const tokenPayload = {
                company_object_id: String(userExists.company_object_id),
                _id: String(userExists._id),
                role: "user",
                full_name: userExists.full_name,
            };
            const token = (0, generateToken_service_1.default)(tokenPayload);
            return res.status(200).json({
                message: "User authenticated successfully",
                data: {
                    user: userExists,
                    company: companyInstance,
                    token: token,
                },
            });
        }
        return res.status(200).json({
            message: "User google login and redirect company details page successfully",
        });
    }
    catch (error) {
        console.error("Error during Google sign-up:", error);
        return res.status(500).json({
            message: "Internal server error",
        });
    }
});
exports.googleSignUp = googleSignUp;
const googleAuth = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const url = oauth2Client.generateAuthUrl({
            access_type: "offline",
            scope: GoogleAuth_1.SCOPES,
        });
        res.redirect(url);
    }
    catch (error) {
        console.error("Error during Google authentication:", error);
        return res.status(500).json({
            message: "Internal server error",
        });
    }
});
exports.googleAuth = googleAuth;
const googleAuthCallback = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { code } = req.query;
        const { _id } = req.user;
        if (!code || typeof code !== "string") {
            return res
                .status(400)
                .json({ message: "Authorization code is required" });
        }
        const { tokens } = yield oauth2Client.getToken(code);
        const { access_token, refresh_token, expiry_date } = tokens;
        const updatedAuthToken = yield authToken_model_1.default.findOneAndUpdate({ user_object_id: _id }, {
            $set: {
                google: {
                    access_token,
                    refresh_token,
                    expiry_date: new Date(expiry_date || 0).getTime(),
                }
            }
        });
        if (!updatedAuthToken) {
            yield authToken_model_1.default.create({
                user_object_id: _id,
                google: {
                    access_token,
                    refresh_token,
                    expiry_date: new Date(expiry_date || 0).getTime(),
                },
            });
        }
        oauth2Client.setCredentials(tokens);
        res.json({ message: "Google authentication successful", tokens });
    }
    catch (error) {
        console.error("Error during Google authentication callback:", error);
        return res.status(500).json({
            message: "Internal server error",
        });
    }
});
exports.googleAuthCallback = googleAuthCallback;
