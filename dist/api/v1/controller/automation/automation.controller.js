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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleGithubPrOpenedWebhook = exports.getGithubPrToTrelloAutomationStatus = exports.setupGithubPrToTrelloAutomation = void 0;
const crypto_1 = require("crypto");
const config_1 = require("../../../../config/config");
const project_model_1 = __importDefault(require("../../../../models/project/project.model"));
const projectAutomation_model_1 = __importDefault(require("../../../../models/projectAutomation/projectAutomation.model"));
const composioService = __importStar(require("../../../../services/composio/composio.service"));
const AUTOMATION_TYPE = "github_pr_to_trello";
const TRELLO_CREATE_CARD_ACTIONS = [
    "TRELLO_CREATE_CARD",
    "TRELLO_CREATE_A_CARD",
    "TRELLO_CREATE_NEW_CARD",
];
const buildGithubWebhookUrl = (projectId, secret) => {
    const base = (config_1.BACKEND_PUBLIC_URL || "http://localhost:8989").replace(/\/$/, "");
    const encodedSecret = encodeURIComponent(secret);
    return `${base}/api/v1/automation/github/pr-opened/${projectId}?key=${encodedSecret}`;
};
const executeTrelloCreateCard = (userId, projectContext, trelloListId, title, description) => __awaiter(void 0, void 0, void 0, function* () {
    let lastError = null;
    for (const actionName of TRELLO_CREATE_CARD_ACTIONS) {
        try {
            const result = yield composioService.executeAppAction(userId, actionName, {
                idList: trelloListId,
                listId: trelloListId,
                name: `[PR] ${title}`,
                desc: description,
                description,
            }, projectContext);
            return { actionName, result };
        }
        catch (error) {
            lastError = error;
        }
    }
    throw lastError || new Error("No Trello create-card action succeeded.");
});
/**
 * Configure GitHub PR -> Trello automation for a project.
 */
const setupGithubPrToTrelloAutomation = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { projectId, githubRepoOwner, githubRepoName, trelloListId, githubWebhookSecret, } = req.body || {};
        const { company_object_id, _id: userId } = req.user;
        if (!projectId || !githubRepoOwner || !githubRepoName || !trelloListId) {
            return res.status(400).json({
                message: "projectId, githubRepoOwner, githubRepoName and trelloListId are required",
            });
        }
        const project = yield project_model_1.default.findOne({
            _id: projectId,
            company_object_id,
        })
            .select("_id")
            .lean();
        if (!project) {
            return res.status(404).json({ message: "Project not found" });
        }
        const secret = typeof githubWebhookSecret === "string" && githubWebhookSecret.trim().length >= 12
            ? githubWebhookSecret.trim()
            : (0, crypto_1.randomBytes)(24).toString("hex");
        const projectContext = String(projectId);
        const automation = yield projectAutomation_model_1.default.findOneAndUpdate({
            project_object_id: projectId,
            automation_type: AUTOMATION_TYPE,
        }, {
            project_object_id: projectId,
            company_object_id,
            created_by_user_object_id: userId,
            automation_type: AUTOMATION_TYPE,
            is_active: true,
            project_context: projectContext,
            github_repo_owner: githubRepoOwner.trim(),
            github_repo_name: githubRepoName.trim(),
            github_webhook_secret: secret,
            trello_list_id: trelloListId.trim(),
        }, {
            upsert: true,
            new: true,
            setDefaultsOnInsert: true,
        });
        const webhookUrl = buildGithubWebhookUrl(String(projectId), secret);
        return res.status(200).json({
            success: true,
            data: {
                automationId: automation._id,
                projectId,
                webhookUrl,
                webhookSecret: secret,
                github: {
                    events: ["pull_request"],
                    contentType: "application/json",
                },
                instructions: "Add this webhook URL to your GitHub repository webhook settings and select pull_request events.",
            },
        });
    }
    catch (error) {
        console.error("setupGithubPrToTrelloAutomation error:", error);
        return res.status(500).json({
            message: "Failed to configure GitHub PR to Trello automation",
            error: error.message,
        });
    }
});
exports.setupGithubPrToTrelloAutomation = setupGithubPrToTrelloAutomation;
/**
 * Get automation status for a project.
 */
const getGithubPrToTrelloAutomationStatus = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { projectId } = req.params;
        const { company_object_id } = req.user;
        const project = yield project_model_1.default.findOne({
            _id: projectId,
            company_object_id,
        })
            .select("_id")
            .lean();
        if (!project) {
            return res.status(404).json({ message: "Project not found" });
        }
        const automation = yield projectAutomation_model_1.default.findOne({
            project_object_id: projectId,
            automation_type: AUTOMATION_TYPE,
        }).lean();
        return res.status(200).json({
            success: true,
            data: {
                configured: !!automation,
                isActive: !!(automation === null || automation === void 0 ? void 0 : automation.is_active),
                githubRepoOwner: (automation === null || automation === void 0 ? void 0 : automation.github_repo_owner) || null,
                githubRepoName: (automation === null || automation === void 0 ? void 0 : automation.github_repo_name) || null,
                trelloListId: (automation === null || automation === void 0 ? void 0 : automation.trello_list_id) || null,
                webhookUrl: automation
                    ? buildGithubWebhookUrl(String(projectId), automation.github_webhook_secret)
                    : null,
            },
        });
    }
    catch (error) {
        console.error("getGithubPrToTrelloAutomationStatus error:", error);
        return res.status(500).json({
            message: "Failed to fetch automation status",
            error: error.message,
        });
    }
});
exports.getGithubPrToTrelloAutomationStatus = getGithubPrToTrelloAutomationStatus;
/**
 * Public GitHub webhook receiver for PR opened events.
 */
const handleGithubPrOpenedWebhook = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c, _d, _e;
    try {
        const { projectId } = req.params;
        const key = typeof ((_a = req.query) === null || _a === void 0 ? void 0 : _a.key) === "string" ? req.query.key : "";
        const automation = yield projectAutomation_model_1.default.findOne({
            project_object_id: projectId,
            automation_type: AUTOMATION_TYPE,
            is_active: true,
        }).lean();
        if (!automation) {
            return res.status(404).json({ message: "Automation config not found" });
        }
        if (!key || key !== automation.github_webhook_secret) {
            return res.status(401).json({ message: "Invalid webhook key" });
        }
        const githubEvent = String(req.header("x-github-event") || "").toLowerCase();
        if (githubEvent === "ping") {
            return res.status(200).json({ success: true, message: "Webhook verified" });
        }
        if (githubEvent !== "pull_request") {
            return res.status(202).json({ success: true, message: "Ignored non-PR event" });
        }
        const action = String(((_b = req.body) === null || _b === void 0 ? void 0 : _b.action) || "").toLowerCase();
        if (action !== "opened") {
            return res.status(202).json({ success: true, message: "Ignored PR action" });
        }
        const pullRequest = (_c = req.body) === null || _c === void 0 ? void 0 : _c.pull_request;
        const repository = (_d = req.body) === null || _d === void 0 ? void 0 : _d.repository;
        const sender = (_e = req.body) === null || _e === void 0 ? void 0 : _e.sender;
        if (!pullRequest || !repository) {
            return res.status(400).json({ message: "Invalid pull_request payload" });
        }
        const prTitle = String(pullRequest.title || `PR #${pullRequest.number || ""}`);
        const prUrl = String(pullRequest.html_url || "");
        const repoFullName = String(repository.full_name ||
            `${automation.github_repo_owner}/${automation.github_repo_name}`);
        const openedBy = String((sender === null || sender === void 0 ? void 0 : sender.login) || "unknown");
        const description = [
            `Repository: ${repoFullName}`,
            `Opened by: ${openedBy}`,
            `Pull Request: ${prUrl}`,
            "",
            `Project Context: ${automation.project_context}`,
        ].join("\n");
        const result = yield executeTrelloCreateCard(automation.created_by_user_object_id.toString(), automation.project_context, automation.trello_list_id, prTitle, description);
        return res.status(200).json({
            success: true,
            data: {
                message: "Trello task created from GitHub PR",
                actionName: result.actionName,
            },
        });
    }
    catch (error) {
        console.error("handleGithubPrOpenedWebhook error:", error);
        return res.status(500).json({
            message: "Failed processing GitHub PR webhook",
            error: error.message,
        });
    }
});
exports.handleGithubPrOpenedWebhook = handleGithubPrOpenedWebhook;
