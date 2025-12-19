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
exports.googleSignUp = void 0;
const users_model_1 = __importDefault(require("../../../../models/users/users.model"));
const company_model_1 = __importDefault(require("../../../../models/company/company.model"));
const generateToken_service_1 = __importDefault(require("../../../../services/generateToken/generateToken.service"));
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
