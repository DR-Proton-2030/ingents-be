import { Composio } from "@composio/core";
import { COMPOSIO_API_KEY, FRONTEND_URL } from "../../config/config";

let composioInstance: Composio;

const TOOLKIT_ALIAS_MAP: Record<string, string> = {
    "google drive": "googledrive",
    google_drive: "googledrive",
    drive: "googledrive",
    googlecalendar: "googlecalendar",
    google_calendar: "googlecalendar",
};

const DEFAULT_CONNECT_CALLBACK =
    `${FRONTEND_URL || "http://localhost:3000"}/dashboard/project-management`;

const PROJECT_SCOPE_SEPARATOR = "__project__";

const ensureComposioApiKey = () => {
    if (!COMPOSIO_API_KEY) {
        throw new Error("COMPOSIO_API_KEY is not defined in environment variables.");
    }
};

const normalizeToolkitName = (toolkitName: string) =>
    toolkitName.trim().toLowerCase();

const sanitizeScopeSegment = (value: string) =>
    value.trim().replace(/[^a-zA-Z0-9_-]/g, "_");

export const buildScopedComposioUserId = (userId: string, projectContext?: string) => {
    const normalizedUserId = sanitizeScopeSegment(userId);
    if (!projectContext || !projectContext.trim()) {
        return normalizedUserId;
    }

    const normalizedProject = sanitizeScopeSegment(projectContext);
    return `${normalizedUserId}${PROJECT_SCOPE_SEPARATOR}${normalizedProject}`;
};

export const getComposioInstance = (): Composio => {
    if (!composioInstance) {
        ensureComposioApiKey();
        composioInstance = new Composio({
            apiKey: COMPOSIO_API_KEY,
        });
    }
    return composioInstance;
};

export const createComposioSession = async (userId: string, projectContext?: string) => {
    const composio = getComposioInstance();
    const scopedUserId = buildScopedComposioUserId(userId, projectContext);

    return composio.create(scopedUserId, {
        manageConnections: true,
    });
};

const resolveToolkitSlug = async (toolkitName: string) => {
    const normalized = normalizeToolkitName(toolkitName);
    const aliased = TOOLKIT_ALIAS_MAP[normalized] || normalized;

    const availableToolkits = await listAvailableApps();
    const exactMatch = availableToolkits.find((toolkit) => toolkit.slug === aliased);

    if (exactMatch) {
        return exactMatch.slug;
    }

    const fuzzyMatch = availableToolkits.find(
        (toolkit) =>
            toolkit.slug.toLowerCase() === aliased ||
            toolkit.name.toLowerCase() === aliased
    );

    if (fuzzyMatch) {
        return fuzzyMatch.slug;
    }

    throw new Error(`Toolkit '${toolkitName}' is not available in Composio.`);
};

/**
 * Generate a connect link URL for a user to authorize a toolkit.
 */
export const getAuthorizationUrl = async (
    userId: string,
    toolkitName: string,
    redirectUrl?: string,
    projectContext?: string
) => {
    const toolkitSlug = await resolveToolkitSlug(toolkitName);
    const session = await createComposioSession(userId, projectContext);
    const connectionRequest = await session.authorize(toolkitSlug, {
        callbackUrl: redirectUrl || DEFAULT_CONNECT_CALLBACK,
    });

    if (!connectionRequest.redirectUrl) {
        throw new Error("Composio did not return a redirect URL for authentication.");
    }

    return connectionRequest.redirectUrl;
};

/**
 * List all active connections for a user.
 */
export const listUserConnections = async (userId: string, projectContext?: string) => {
    const composio = getComposioInstance();
    const scopedUserId = buildScopedComposioUserId(userId, projectContext);
    const response = await composio.connectedAccounts.list({
        userIds: [scopedUserId],
    });

    return response.items;
};

/**
 * Execute a specific Composio tool action.
 */
export const executeAppAction = async (
    userId: string,
    actionName: string,
    parameters: Record<string, any>,
    projectContext?: string
) => {
    const composio = getComposioInstance();
    const scopedUserId = buildScopedComposioUserId(userId, projectContext);
    const result = await composio.tools.execute(actionName, {
        userId: scopedUserId,
        arguments: parameters,
        dangerouslySkipVersionCheck: true,
    });

    return result;
};

/**
 * List all available apps/toolkits supported by Composio.
 */
export const listAvailableApps = async () => {
    const composio = getComposioInstance();
    const toolkits = await composio.toolkits.get({});

    if (!Array.isArray(toolkits)) {
        return [];
    }

    return toolkits.map((toolkit) => ({
        slug: toolkit.slug,
        name: toolkit.name,
        description: toolkit.meta?.description || "",
        logo: toolkit.meta?.logo || "",
        categories: toolkit.meta?.categories?.map((category) => category.name) || [],
    }));
};
