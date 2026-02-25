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
exports.publishInstagramMedia = exports.getInstagramMediaStatus = exports.createInstagramMedia = exports.getInstagramLongLivedToken = exports.getInstagramProfile = exports.getInstagramUser = exports.getInstagramAuthURL = void 0;
const axios_1 = __importDefault(require("axios"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config({ override: true });
const INSTAGRAM_CLIENT_ID = process.env.INSTAGRAM_CLIENT_ID;
const INSTAGRAM_CLIENT_SECRET = process.env.INSTAGRAM_CLIENT_SECRET;
const REDIRECT_URI = process.env.INSTAGRAM_REDIRECT_URI;
const getInstagramAuthURL = (userId) => {
    const redirectUriEncoded = encodeURIComponent(REDIRECT_URI);
    const stateEncoded = btoa(userId); // encode userId to base64
    return `https://www.instagram.com/oauth/authorize?force_reauth=true&client_id=${INSTAGRAM_CLIENT_ID}&redirect_uri=${redirectUriEncoded}&response_type=code&scope=instagram_business_basic%2Cinstagram_business_manage_messages%2Cinstagram_business_manage_comments%2Cinstagram_business_content_publish%2Cinstagram_business_manage_insights&state=${stateEncoded}`;
};
exports.getInstagramAuthURL = getInstagramAuthURL;
const getInstagramUser = (code) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    console.log("Called with code:", code);
    const tokenUrl = `https://api.instagram.com/oauth/access_token`;
    try {
        const { data } = yield axios_1.default.post(tokenUrl, new URLSearchParams({
            client_id: INSTAGRAM_CLIENT_ID,
            client_secret: INSTAGRAM_CLIENT_SECRET,
            grant_type: "authorization_code",
            redirect_uri: REDIRECT_URI,
            code,
        }), {
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
            },
        });
        const accessToken = data.access_token;
        console.log("Instagram access_token:", accessToken);
        // Optionally fetch user details using Graph API
        // const userResponse = await axios.get(
        //   `https://graph.facebook.com/me?fields=id,username&access_token=${accessToken}`
        // );
        // console.log("User info:", userResponse.data);
        return {
            tokens: {
                access_token: accessToken,
            },
            // user: userResponse.data,
        };
    }
    catch (error) {
        console.error("Error fetching Instagram token:", ((_a = error.response) === null || _a === void 0 ? void 0 : _a.data) || error.message);
        throw error;
    }
});
exports.getInstagramUser = getInstagramUser;
const getInstagramProfile = (accessToken) => __awaiter(void 0, void 0, void 0, function* () {
    var _b;
    try {
        const url = `https://graph.instagram.com/me`;
        const params = {
            fields: "id,username,name,account_type,profile_picture_url,followers_count,follows_count,media_count",
            access_token: accessToken,
        };
        const { data } = yield axios_1.default.get(url, { params });
        return data;
    }
    catch (error) {
        console.error("Error fetching Instagram profile:", ((_b = error.response) === null || _b === void 0 ? void 0 : _b.data) || error.message);
        throw new Error("Failed to fetch Instagram profile");
    }
});
exports.getInstagramProfile = getInstagramProfile;
// Get Long Lived Token
const getInstagramLongLivedToken = (shortLivedToken) => __awaiter(void 0, void 0, void 0, function* () {
    var _c;
    try {
        const url = "https://graph.instagram.com/access_token";
        const params = {
            grant_type: "ig_exchange_token",
            client_secret: INSTAGRAM_CLIENT_SECRET,
            access_token: shortLivedToken,
        };
        const { data } = yield axios_1.default.get(url, { params });
        return {
            access_token: data.access_token,
            token_type: data.token_type,
            expires_in: data.expires_in,
        };
    }
    catch (error) {
        console.error("Error exchanging long-lived token:", ((_c = error.response) === null || _c === void 0 ? void 0 : _c.data) || error.message);
        throw new Error("Failed to get long-lived Instagram token");
    }
});
exports.getInstagramLongLivedToken = getInstagramLongLivedToken;
const createInstagramMedia = (_d) => __awaiter(void 0, [_d], void 0, function* ({ accessToken, igUserId, imageUrl, videoUrl, caption, mediaType = "IMAGE", }) {
    var _e;
    if (!imageUrl && !videoUrl) {
        throw new Error("imageUrl or videoUrl is required to create a media container");
    }
    try {
        const url = `https://graph.instagram.com/v18.0/${igUserId}/media`;
        const body = {
            caption,
            media_type: mediaType,
        };
        if (mediaType === "VIDEO" || mediaType === "REELS") {
            body.video_url = videoUrl || imageUrl;
        }
        else {
            body.image_url = imageUrl;
        }
        const { data } = yield axios_1.default.post(url, body, {
            headers: {
                Authorization: `Bearer ${accessToken}`,
                "Content-Type": "application/json",
            },
        });
        // Returns the container ID
        return data;
    }
    catch (error) {
        console.error("Error creating Instagram media:", ((_e = error.response) === null || _e === void 0 ? void 0 : _e.data) || error.message);
        throw new Error("Failed to create Instagram media");
    }
});
exports.createInstagramMedia = createInstagramMedia;
const getInstagramMediaStatus = (_f) => __awaiter(void 0, [_f], void 0, function* ({ accessToken, containerId, }) {
    var _g;
    try {
        const url = `https://graph.instagram.com/v18.0/${containerId}`;
        const { data } = yield axios_1.default.get(url, {
            params: {
                fields: "status_code",
                access_token: accessToken,
            },
        });
        return data;
    }
    catch (error) {
        console.error("Error fetching Instagram media status:", ((_g = error.response) === null || _g === void 0 ? void 0 : _g.data) || error.message);
        throw new Error("Failed to fetch Instagram media status");
    }
});
exports.getInstagramMediaStatus = getInstagramMediaStatus;
const publishInstagramMedia = (_h) => __awaiter(void 0, [_h], void 0, function* ({ accessToken, igUserId, containerId, }) {
    var _j;
    try {
        const url = `https://graph.instagram.com/v18.0/${igUserId}/media_publish`;
        const body = {
            creation_id: containerId,
        };
        const { data } = yield axios_1.default.post(url, body, {
            headers: {
                Authorization: `Bearer ${accessToken}`,
                "Content-Type": "application/json",
            },
        });
        return data; // Returns the published post ID
    }
    catch (error) {
        console.error("Error publishing Instagram media:", ((_j = error.response) === null || _j === void 0 ? void 0 : _j.data) || error.message);
        throw new Error("Failed to publish Instagram media");
    }
});
exports.publishInstagramMedia = publishInstagramMedia;
