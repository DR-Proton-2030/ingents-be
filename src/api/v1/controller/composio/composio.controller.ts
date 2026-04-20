import { Request, Response } from "express";
import * as composioService from "../../../../services/composio/composio.service";

/**
 * Get all available apps and the user's connection status for each.
 */
export const getIntegrations = async (req: any, res: any) => {
    try {
        const userId = req.user._id.toString();
        const projectContext =
            typeof req.query?.projectContext === "string"
                ? req.query.projectContext
                : undefined;
        
        // Parallel fetch for speed
        const [availableApps, userConnections] = await Promise.all([
            composioService.listAvailableApps(),
            composioService.listUserConnections(userId, projectContext)
        ]);

        const activeConnectionsByToolkit = new Map<string, any>();
        userConnections.forEach((connection: any) => {
            const toolkitSlug = connection.toolkit?.slug;
            if (!toolkitSlug) return;

            const hasExisting = activeConnectionsByToolkit.has(toolkitSlug);
            const isActive = connection.status === "ACTIVE";

            if (!hasExisting || isActive) {
                activeConnectionsByToolkit.set(toolkitSlug, connection);
            }
        });

        // Map connection status to available apps
        const integrations = availableApps.map((app: any) => {
            const connection = activeConnectionsByToolkit.get(app.slug);
            return {
                name: app.slug,
                displayName: app.name,
                description: app.description,
                logo: app.logo,
                category: app.categories?.[0] || "General",
                isConnected: !!connection && connection.status === "ACTIVE",
                connectionId: connection?.id || null,
                status: connection?.status || 'none'
            };
        });

        return res.status(200).json({
            success: true,
            data: integrations
        });
    } catch (error: any) {
        console.error("Error in getIntegrations:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to fetch integrations",
            error: error.message
        });
    }
};

/**
 * Start the OAuth flow for a specific app.
 */
export const initiateConnection = async (req: any, res: any) => {
    try {
        const userId = req.user._id.toString();
        const { toolkitName, redirectUrl, projectContext } = req.body;

        if (!toolkitName) {
            return res.status(400).json({
                success: false,
                message: "toolkitName is required"
            });
        }

        const authUrl = await composioService.getAuthorizationUrl(
            userId,
            toolkitName,
            redirectUrl,
            typeof projectContext === "string" ? projectContext : undefined
        );

        return res.status(200).json({
            success: true,
            data: { authUrl }
        });
    } catch (error: any) {
        console.error("Error in initiateConnection:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to initiate connection",
            error: error.message
        });
    }
};

/**
 * Execute an action (for testing or direct UI triggers).
 */
export const executeAction = async (req: any, res: any) => {
    try {
        const userId = req.user._id.toString();
        const { actionName, parameters, projectContext } = req.body;

        if (!actionName) {
            return res.status(400).json({
                success: false,
                message: "actionName is required"
            });
        }

        const result = await composioService.executeAppAction(
            userId,
            actionName,
            parameters || {},
            typeof projectContext === "string" ? projectContext : undefined
        );

        return res.status(200).json({
            success: true,
            data: result
        });
    } catch (error: any) {
        console.error("Error in executeAction:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to execute action",
            error: error.message
        });
    }
};
