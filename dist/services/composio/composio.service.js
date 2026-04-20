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
Object.defineProperty(exports, "__esModule", { value: true });
exports.listAvailableApps = exports.executeAppAction = exports.listUserConnections = exports.getAuthorizationUrl = exports.createComposioSession = exports.getComposioInstance = void 0;
const core_1 = require("@composio/core");
const config_1 = require("../../config/config");
let composioInstance;
const TOOLKIT_ALIAS_MAP = {
    "google drive": "googledrive",
    google_drive: "googledrive",
    drive: "googledrive",
    googlecalendar: "googlecalendar",
    google_calendar: "googlecalendar",
};
const DEFAULT_CONNECT_CALLBACK = `${config_1.FRONTEND_URL || "http://localhost:3000"}/dashboard/project-management`;
const ensureComposioApiKey = () => {
    if (!config_1.COMPOSIO_API_KEY) {
        throw new Error("COMPOSIO_API_KEY is not defined in environment variables.");
    }
};
const normalizeToolkitName = (toolkitName) => toolkitName.trim().toLowerCase();
const getComposioInstance = () => {
    if (!composioInstance) {
        ensureComposioApiKey();
        composioInstance = new core_1.Composio({
            apiKey: config_1.COMPOSIO_API_KEY,
        });
    }
    return composioInstance;
};
exports.getComposioInstance = getComposioInstance;
const createComposioSession = (userId) => __awaiter(void 0, void 0, void 0, function* () {
    const composio = (0, exports.getComposioInstance)();
    return composio.create(userId, {
        manageConnections: true,
    });
});
exports.createComposioSession = createComposioSession;
const resolveToolkitSlug = (toolkitName) => __awaiter(void 0, void 0, void 0, function* () {
    const normalized = normalizeToolkitName(toolkitName);
    const aliased = TOOLKIT_ALIAS_MAP[normalized] || normalized;
    const availableToolkits = yield (0, exports.listAvailableApps)();
    const exactMatch = availableToolkits.find((toolkit) => toolkit.slug === aliased);
    if (exactMatch) {
        return exactMatch.slug;
    }
    const fuzzyMatch = availableToolkits.find((toolkit) => toolkit.slug.toLowerCase() === aliased ||
        toolkit.name.toLowerCase() === aliased);
    if (fuzzyMatch) {
        return fuzzyMatch.slug;
    }
    throw new Error(`Toolkit '${toolkitName}' is not available in Composio.`);
});
/**
 * Generate a connect link URL for a user to authorize a toolkit.
 */
const getAuthorizationUrl = (userId, toolkitName, redirectUrl) => __awaiter(void 0, void 0, void 0, function* () {
    const toolkitSlug = yield resolveToolkitSlug(toolkitName);
    const session = yield (0, exports.createComposioSession)(userId);
    const connectionRequest = yield session.authorize(toolkitSlug, {
        callbackUrl: redirectUrl || DEFAULT_CONNECT_CALLBACK,
    });
    if (!connectionRequest.redirectUrl) {
        throw new Error("Composio did not return a redirect URL for authentication.");
    }
    return connectionRequest.redirectUrl;
});
exports.getAuthorizationUrl = getAuthorizationUrl;
/**
 * List all active connections for a user.
 */
const listUserConnections = (userId) => __awaiter(void 0, void 0, void 0, function* () {
    const composio = (0, exports.getComposioInstance)();
    const response = yield composio.connectedAccounts.list({
        userIds: [userId],
    });
    return response.items;
});
exports.listUserConnections = listUserConnections;
/**
 * Execute a specific Composio tool action.
 */
const executeAppAction = (userId, actionName, parameters) => __awaiter(void 0, void 0, void 0, function* () {
    const composio = (0, exports.getComposioInstance)();
    const result = yield composio.tools.execute(actionName, {
        userId,
        arguments: parameters,
        dangerouslySkipVersionCheck: true,
    });
    return result;
});
exports.executeAppAction = executeAppAction;
/**
 * List all available apps/toolkits supported by Composio.
 */
const listAvailableApps = () => __awaiter(void 0, void 0, void 0, function* () {
    const composio = (0, exports.getComposioInstance)();
    const toolkits = yield composio.toolkits.get({});
    if (!Array.isArray(toolkits)) {
        return [];
    }
    return toolkits.map((toolkit) => {
        var _a, _b, _c, _d;
        return ({
            slug: toolkit.slug,
            name: toolkit.name,
            description: ((_a = toolkit.meta) === null || _a === void 0 ? void 0 : _a.description) || "",
            logo: ((_b = toolkit.meta) === null || _b === void 0 ? void 0 : _b.logo) || "",
            categories: ((_d = (_c = toolkit.meta) === null || _c === void 0 ? void 0 : _c.categories) === null || _d === void 0 ? void 0 : _d.map((category) => category.name)) || [],
        });
    });
});
exports.listAvailableApps = listAvailableApps;
