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
exports.resolveYouTubePublishAt = exports.LongLivedYouTubeAccessToken = exports.getAuthorizedClient = void 0;
const axios_1 = __importDefault(require("axios"));
const dotenv_1 = __importDefault(require("dotenv"));
const googleapis_1 = require("googleapis");
dotenv_1.default.config();
const YT_CLIENT_ID = process.env.YT_CLIENT_ID;
const YT_CLIENT_SECRET = process.env.YT_CLIENT_SECRET;
const YT_REDIRECT_URI = process.env.YT_REDIRECT_URI;
/** Helper to get an authorized YouTube client using a refresh token */
const getAuthorizedClient = (refreshToken) => __awaiter(void 0, void 0, void 0, function* () {
    const client = new googleapis_1.google.auth.OAuth2(YT_CLIENT_ID, YT_CLIENT_SECRET, YT_REDIRECT_URI);
    client.setCredentials({ refresh_token: refreshToken });
    const accessTokenResponse = yield client.getAccessToken();
    client.setCredentials({
        access_token: (accessTokenResponse === null || accessTokenResponse === void 0 ? void 0 : accessTokenResponse.token) || refreshToken,
        refresh_token: refreshToken,
    });
    return {
        youtube: googleapis_1.google.youtube({ version: "v3", auth: client }),
        analytics: googleapis_1.google.youtubeAnalytics({ version: "v2", auth: client }),
    };
});
exports.getAuthorizedClient = getAuthorizedClient;
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
/**
 * Resolve schedule time into ISO string acceptable by YouTube's `status.publishAt`.
 * Supports:
 * - `scheduleAt`, `publishAt`, `scheduledAt`, `scheduled_publish_time`
 * - numeric seconds or milliseconds since epoch
 * - `scheduleDate` + `scheduleTime` (HH:mm) with optional `tzOffsetMinutes`
 * Returns `{ iso, error }` where `iso` is valid future time or null.
 */
const resolveYouTubePublishAt = (body) => {
    var _a, _b, _c, _d;
    try {
        if (!body)
            return { iso: null };
        const raw = (_d = (_c = (_b = (_a = body.publishAt) !== null && _a !== void 0 ? _a : body.scheduleAt) !== null && _b !== void 0 ? _b : body.scheduledAt) !== null && _c !== void 0 ? _c : body.scheduled_publish_time) !== null && _d !== void 0 ? _d : null;
        let iso = null;
        if (raw == null) {
            if (body.scheduleDate && body.scheduleTime) {
                const base = new Date(`${body.scheduleDate}T${body.scheduleTime}:00Z`);
                if (!isNaN(base.getTime())) {
                    const offset = Number(body.tzOffsetMinutes);
                    if (!Number.isNaN(offset)) {
                        const adjusted = new Date(base.getTime() - offset * 60000);
                        iso = adjusted.toISOString();
                    }
                    else {
                        iso = base.toISOString();
                    }
                }
            }
        }
        else {
            // Numbers (ms or seconds)
            const num = Number(raw);
            if (!Number.isNaN(num)) {
                const millis = num > 1e12 ? num : num * 1000;
                const d = new Date(millis);
                if (!isNaN(d.getTime()))
                    iso = d.toISOString();
            }
            else {
                // Strings (ISO or date-like)
                const d = new Date(String(raw));
                if (!isNaN(d.getTime()))
                    iso = d.toISOString();
            }
        }
        if (!iso)
            return { iso: null };
        // Basic future validation (at least 60 seconds ahead)
        const when = new Date(iso).getTime();
        const nowPlus = Date.now() + 60000;
        if (when <= nowPlus) {
            return {
                iso: null,
                error: "scheduleAt must be at least 60 seconds in the future",
            };
        }
        return { iso };
    }
    catch (e) {
        return { iso: null, error: (e === null || e === void 0 ? void 0 : e.message) || "Failed to parse schedule time" };
    }
};
exports.resolveYouTubePublishAt = resolveYouTubePublishAt;
