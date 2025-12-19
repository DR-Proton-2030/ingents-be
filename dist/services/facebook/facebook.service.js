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
exports.getPageTokenService = exports.getLongLivedToken = exports.fetchFacebookPagesFromCode = exports.getFacebookPages = exports.getFacebookUser = exports.getFacebookAuthURL = void 0;
const axios_1 = __importDefault(require("axios"));
const dotenv_1 = __importDefault(require("dotenv"));
const users_model_1 = __importDefault(require("../../models/users/users.model"));
dotenv_1.default.config();
const FACEBOOK_CLIENT_ID = process.env.FACEBOOK_CLIENT_ID;
const FACEBOOK_CLIENT_SECRET = process.env.FACEBOOK_CLIENT_SECRET;
const REDIRECT_URI = process.env.FACEBOOK_REDIRECT_URI;
const FACEBOOK_GRAPH_URL = "https://graph.facebook.com";
const getFacebookAuthURL = (userId) => {
    const authUrl = `https://www.facebook.com/v18.0/dialog/oauth?client_id=${FACEBOOK_CLIENT_ID}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&scope=email,public_profile,pages_read_engagement,pages_manage_posts,pages_show_list&response_type=code&state=${userId}`;
    return authUrl;
};
exports.getFacebookAuthURL = getFacebookAuthURL;
// cl
const getFacebookUser = (code) => __awaiter(void 0, void 0, void 0, function* () {
    const tokenUrl = `https://graph.facebook.com/v18.0/oauth/access_token`;
    const params = new URLSearchParams({
        client_id: FACEBOOK_CLIENT_ID,
        client_secret: FACEBOOK_CLIENT_SECRET,
        redirect_uri: REDIRECT_URI,
        code,
    }).toString();
    const { data } = yield axios_1.default.get(`${tokenUrl}?${params}`);
    const accessToken = data.access_token;
    // Fetch user details
    const userResponse = yield axios_1.default.get(`https://graph.facebook.com/me?fields=id,name,email&access_token=${accessToken}`);
    console.log(userResponse);
    return { tokens: { access_token: accessToken }, user: userResponse.data };
});
exports.getFacebookUser = getFacebookUser;
const getFacebookPages = (accessToken) => __awaiter(void 0, void 0, void 0, function* () {
    const pagesUrl = `${FACEBOOK_GRAPH_URL}/me/accounts`;
    const { data } = yield axios_1.default.get(pagesUrl, {
        headers: {
            Authorization: `Bearer ${accessToken}`,
        },
    });
    return data.data; // List of pages
});
exports.getFacebookPages = getFacebookPages;
const fetchFacebookPagesFromCode = (code) => __awaiter(void 0, void 0, void 0, function* () {
    const { tokens, user } = yield (0, exports.getFacebookUser)(code);
    const longLivedToken = yield (0, exports.getLongLivedToken)(tokens.access_token);
    const pages = yield (0, exports.getFacebookPages)(longLivedToken);
    return {
        user,
        access_token: longLivedToken,
        pages,
    };
});
exports.fetchFacebookPagesFromCode = fetchFacebookPagesFromCode;
// Get Long Lived Token
const getLongLivedToken = (access_token) => __awaiter(void 0, void 0, void 0, function* () {
    const res = yield axios_1.default.get("https://graph.facebook.com/v19.0/oauth/access_token", {
        params: {
            grant_type: "fb_exchange_token",
            client_id: FACEBOOK_CLIENT_ID,
            client_secret: FACEBOOK_CLIENT_SECRET,
            fb_exchange_token: access_token,
        },
    });
    console.log("Long-Lived Token:", res.data.access_token);
    return res.data.access_token;
});
exports.getLongLivedToken = getLongLivedToken;
const getPageTokenService = (userId, pageId) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c;
    if (!userId || !pageId) {
        throw new Error("userId and pageId are required");
    }
    const user = yield users_model_1.default.findById(userId).exec();
    if (!user || !((_a = user.facebook) === null || _a === void 0 ? void 0 : _a.access_token)) {
        throw new Error("Facebook user access token not found");
    }
    const userAccessToken = user.facebook.access_token;
    const pagesRes = yield axios_1.default.get(`https://graph.facebook.com/v20.0/me/accounts?access_token=${userAccessToken}`);
    const pageData = (_c = (_b = pagesRes.data) === null || _b === void 0 ? void 0 : _b.data) === null || _c === void 0 ? void 0 : _c.find((p) => p.id === pageId);
    if (!pageData) {
        throw new Error("Page not found or user is not admin of this page");
    }
    return {
        id: pageData.id,
        pageName: pageData.name,
        pageAccessToken: pageData.access_token,
        category: pageData.category,
        user,
    };
});
exports.getPageTokenService = getPageTokenService;
