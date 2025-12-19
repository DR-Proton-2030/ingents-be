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
exports.LongLivedYouTubeAccessToken = void 0;
const axios_1 = __importDefault(require("axios"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const YT_CLIENT_ID = process.env.YT_CLIENT_ID;
const YT_CLIENT_SECRET = process.env.YT_CLIENT_SECRET;
const YT_REDIRECT_URI = process.env.YT_REDIRECT_URI;
function LongLivedYouTubeAccessToken(refreshToken) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a;
        try {
            const tokenUrl = "https://oauth2.googleapis.com/token";
            const params = new URLSearchParams({
                client_id: YT_CLIENT_ID,
                client_secret: YT_CLIENT_SECRET,
                refresh_token: refreshToken,
                grant_type: "refresh_token",
            });
            const { data } = yield axios_1.default.post(tokenUrl, params);
            return {
                access_token: data.access_token,
                expires_in: data.expires_in, // usually 3600 seconds (1 hour)
            };
        }
        catch (error) {
            console.error("Failed to refresh YouTube access token:", ((_a = error.response) === null || _a === void 0 ? void 0 : _a.data) || error.message);
            throw new Error("Unable to refresh YouTube access token");
        }
    });
}
exports.LongLivedYouTubeAccessToken = LongLivedYouTubeAccessToken;
