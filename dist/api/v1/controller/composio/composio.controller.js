"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
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
exports.executeAction = exports.initiateConnection = exports.getIntegrations = void 0;
const composioService = __importStar(require("../../../../services/composio/composio.service"));
/**
 * Get all available apps and the user's connection status for each.
 */
const getIntegrations = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const userId = req.user._id.toString();
        const projectContext = typeof ((_a = req.query) === null || _a === void 0 ? void 0 : _a.projectContext) === "string"
            ? req.query.projectContext
            : undefined;
        // Parallel fetch for speed
        const [availableApps, userConnections] = yield Promise.all([
            composioService.listAvailableApps(),
            composioService.listUserConnections(userId, projectContext)
        ]);
        const activeConnectionsByToolkit = new Map();
        userConnections.forEach((connection) => {
            var _a;
            const toolkitSlug = (_a = connection.toolkit) === null || _a === void 0 ? void 0 : _a.slug;
            if (!toolkitSlug)
                return;
            const hasExisting = activeConnectionsByToolkit.has(toolkitSlug);
            const isActive = connection.status === "ACTIVE";
            if (!hasExisting || isActive) {
                activeConnectionsByToolkit.set(toolkitSlug, connection);
            }
        });
        // Map connection status to available apps
        const integrations = availableApps.map((app) => {
            var _a;
            const connection = activeConnectionsByToolkit.get(app.slug);
            return {
                name: app.slug,
                displayName: app.name,
                description: app.description,
                logo: app.logo,
                category: ((_a = app.categories) === null || _a === void 0 ? void 0 : _a[0]) || "General",
                isConnected: !!connection && connection.status === "ACTIVE",
                connectionId: (connection === null || connection === void 0 ? void 0 : connection.id) || null,
                status: (connection === null || connection === void 0 ? void 0 : connection.status) || 'none'
            };
        });
        return res.status(200).json({
            success: true,
            data: integrations
        });
    }
    catch (error) {
        console.error("Error in getIntegrations:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to fetch integrations",
            error: error.message
        });
    }
});
exports.getIntegrations = getIntegrations;
/**
 * Start the OAuth flow for a specific app.
 */
const initiateConnection = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = req.user._id.toString();
        const { toolkitName, redirectUrl, projectContext } = req.body;
        if (!toolkitName) {
            return res.status(400).json({
                success: false,
                message: "toolkitName is required"
            });
        }
        const authUrl = yield composioService.getAuthorizationUrl(userId, toolkitName, redirectUrl, typeof projectContext === "string" ? projectContext : undefined);
        return res.status(200).json({
            success: true,
            data: { authUrl }
        });
    }
    catch (error) {
        console.error("Error in initiateConnection:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to initiate connection",
            error: error.message
        });
    }
});
exports.initiateConnection = initiateConnection;
/**
 * Execute an action (for testing or direct UI triggers).
 */
const executeAction = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = req.user._id.toString();
        const { actionName, parameters, projectContext } = req.body;
        if (!actionName) {
            return res.status(400).json({
                success: false,
                message: "actionName is required"
            });
        }
        const result = yield composioService.executeAppAction(userId, actionName, parameters || {}, typeof projectContext === "string" ? projectContext : undefined);
        return res.status(200).json({
            success: true,
            data: result
        });
    }
    catch (error) {
        console.error("Error in executeAction:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to execute action",
            error: error.message
        });
    }
});
exports.executeAction = executeAction;
