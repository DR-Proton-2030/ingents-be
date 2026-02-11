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
exports.getAuthorizedGoogleClient = exports.SCOPES = void 0;
const googleapis_1 = require("googleapis");
const config_1 = require("../../config/config");
const authToken_model_1 = __importDefault(require("../../models/authToken/authToken.model"));
const oauth2Client = new googleapis_1.google.auth.OAuth2(config_1.GOOGLE_CLIENT_ID, config_1.GOOGLE_CLIENT_SECRET, config_1.REDIRECT_URI);
exports.SCOPES = ["https://www.googleapis.com/auth/calendar"];
const getAuthorizedGoogleClient = (user_object_id) => __awaiter(void 0, void 0, void 0, function* () {
    const saved = yield authToken_model_1.default.findOne({ user_object_id });
    if (!saved) {
        throw new Error("No Google auth token found for the user");
    }
    const { access_token, refresh_token, expiry_date } = saved.google;
    oauth2Client.setCredentials({
        access_token,
        refresh_token,
        expiry_date
    });
    // If expired → auto refresh
    const now = Date.now();
    if (expiry_date <= now) {
        const { credentials } = yield oauth2Client.refreshAccessToken();
        yield authToken_model_1.default.updateOne({ user_object_id }, {
            google: {
                access_token: credentials.access_token,
                refresh_token: credentials.refresh_token,
                expiry_date: new Date(credentials.expiry_date || 0).getTime(),
            }
        });
        oauth2Client.setCredentials(credentials);
    }
    return oauth2Client;
});
exports.getAuthorizedGoogleClient = getAuthorizedGoogleClient;
