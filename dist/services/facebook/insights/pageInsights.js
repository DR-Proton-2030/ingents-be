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
exports.getPageLifetimeInsights = exports.getPageInsights = void 0;
const axios_1 = __importDefault(require("axios"));
const FACEBOOK_GRAPH_URL = "https://graph.facebook.com/v20.0"; // v18+ required
// Fetch page insights for a given metric list and window. Gracefully returns [] on errors.
function getPageInsights(pageId_1, accessToken_1, metrics_1, since_1, until_1) {
    return __awaiter(this, arguments, void 0, function* (pageId, accessToken, metrics, since, until, period = "day") {
        var _a;
        try {
            const params = {
                metric: metrics.join(","),
                period,
            };
            if (since)
                params.since = since;
            if (until)
                params.until = until;
            const url = `${FACEBOOK_GRAPH_URL}/${pageId}/insights`;
            const resp = yield axios_1.default.get(url, {
                params,
                headers: { Authorization: `Bearer ${accessToken}` },
            });
            return (((_a = resp.data) === null || _a === void 0 ? void 0 : _a.data) || []);
        }
        catch (_) {
            // Some pages or apps won't have certain metrics or permissions.
            // Return empty array to indicate unavailability.
            return [];
        }
    });
}
exports.getPageInsights = getPageInsights;
// Convenience for lifetime metrics
function getPageLifetimeInsights(pageId, accessToken, metrics) {
    return __awaiter(this, void 0, void 0, function* () {
        return getPageInsights(pageId, accessToken, metrics, undefined, undefined, "lifetime");
    });
}
exports.getPageLifetimeInsights = getPageLifetimeInsights;
