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
exports.getXUserProfile = exports.refreshXToken = exports.exchangeCodeForTokens = exports.getXAuthURL = exports.generatePKCE = void 0;
const axios_1 = __importDefault(require("axios"));
const crypto_1 = __importDefault(require("crypto"));
const dotenv_1 = __importDefault(require("dotenv"));
const users_model_1 = __importDefault(require("../../models/users/users.model"));
dotenv_1.default.config();
const X_OAUTH_AUTHORIZE = "https://twitter.com/i/oauth2/authorize";
const X_OAUTH_TOKEN = "https://api.twitter.com/2/oauth2/token";
function base64url(input) {
    return input
        .toString("base64")
        .replace(/\+/g, "-")
        .replace(/\//g, "_")
        .replace(/=+$/, "");
}
function generatePKCE() {
    const verifier = base64url(crypto_1.default.randomBytes(32));
    const challenge = base64url(crypto_1.default.createHash("sha256").update(verifier).digest());
    return { verifier, challenge, method: "S256" };
}
exports.generatePKCE = generatePKCE;
const getXAuthURL = (userId) => __awaiter(void 0, void 0, void 0, function* () {
    const clientId = process.env.X_CLIENT_ID;
    const redirectUri = process.env.X_REDIRECT_URI;
    if (!clientId || !redirectUri) {
        console.error("Missing X env vars:", { clientId, redirectUri });
        throw new Error("X_CLIENT_ID or X_REDIRECT_URI is missing in .env");
    }
    const { verifier, challenge, method } = generatePKCE();
    // Store verifier for callback
    yield users_model_1.default.findByIdAndUpdate(userId, {
        $set: { "x.pkce_verifier": verifier },
    });
    const state = Buffer.from(userId).toString("base64");
    const scope = [
        "tweet.read",
        "tweet.write",
        "users.read",
        "offline.access",
    ].join(" ");
    const params = new URLSearchParams({
        response_type: "code",
        client_id: clientId,
        redirect_uri: redirectUri,
        scope,
        state,
        code_challenge: challenge,
        code_challenge_method: method,
    }).toString();
    return `${X_OAUTH_AUTHORIZE}?${params}`;
});
exports.getXAuthURL = getXAuthURL;
const exchangeCodeForTokens = (code, userId) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const clientId = process.env.X_CLIENT_ID;
    const clientSecret = process.env.X_CLIENT_SECRET;
    const redirectUri = process.env.X_REDIRECT_URI;
    const user = yield users_model_1.default.findById(userId);
    const verifier = (_a = user === null || user === void 0 ? void 0 : user.x) === null || _a === void 0 ? void 0 : _a.pkce_verifier;
    if (!verifier) {
        throw new Error("Missing PKCE verifier for user");
    }
    const body = new URLSearchParams({
        grant_type: "authorization_code",
        client_id: clientId,
        redirect_uri: redirectUri,
        code_verifier: verifier,
        code,
    }).toString();
    const headers = { "Content-Type": "application/x-www-form-urlencoded" };
    if (clientSecret) {
        const basic = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
        headers["Authorization"] = `Basic ${basic}`;
    }
    const resp = yield axios_1.default.post(X_OAUTH_TOKEN, body, { headers });
    const tokens = resp.data;
    yield users_model_1.default.findByIdAndUpdate(userId, {
        $set: {
            "x.access_token": tokens.access_token,
            "x.refresh_token": tokens.refresh_token,
            "x.pkce_verifier": null,
        },
    });
    return tokens;
});
exports.exchangeCodeForTokens = exchangeCodeForTokens;
const refreshXToken = (userId) => __awaiter(void 0, void 0, void 0, function* () {
    var _b;
    const clientId = process.env.X_CLIENT_ID;
    const clientSecret = process.env.X_CLIENT_SECRET;
    const user = yield users_model_1.default.findById(userId);
    const refresh_token = (_b = user === null || user === void 0 ? void 0 : user.x) === null || _b === void 0 ? void 0 : _b.refresh_token;
    if (!refresh_token)
        throw new Error("Missing refresh token");
    const body = new URLSearchParams({
        grant_type: "refresh_token",
        client_id: clientId,
        refresh_token,
    }).toString();
    const headers = { "Content-Type": "application/x-www-form-urlencoded" };
    if (clientSecret) {
        const basic = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
        headers["Authorization"] = `Basic ${basic}`;
    }
    const resp = yield axios_1.default.post(X_OAUTH_TOKEN, body, { headers });
    const tokens = resp.data;
    yield users_model_1.default.findByIdAndUpdate(userId, {
        $set: {
            "x.access_token": tokens.access_token,
            "x.refresh_token": tokens.refresh_token || refresh_token,
        },
    });
    return tokens;
});
exports.refreshXToken = refreshXToken;
const getXUserProfile = (accessToken) => __awaiter(void 0, void 0, void 0, function* () {
    const { data } = yield axios_1.default.get("https://api.twitter.com/2/users/me?user.fields=profile_image_url,public_metrics,description,location,created_at,url,verified", {
        headers: { Authorization: `Bearer ${accessToken}` },
    });
    return data.data;
});
exports.getXUserProfile = getXUserProfile;
