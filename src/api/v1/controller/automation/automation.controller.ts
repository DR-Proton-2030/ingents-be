import { Request, Response } from "express";
import { randomBytes } from "crypto";
import { BACKEND_PUBLIC_URL } from "../../../../config/config";
import ProjectModel from "../../../../models/project/project.model";
import ProjectAutomationModel from "../../../../models/projectAutomation/projectAutomation.model";
import * as composioService from "../../../../services/composio/composio.service";

const AUTOMATION_TYPE = "github_pr_to_trello";
const TRELLO_CREATE_CARD_ACTIONS = [
  "TRELLO_CREATE_CARD",
  "TRELLO_CREATE_A_CARD",
  "TRELLO_CREATE_NEW_CARD",
];

const buildGithubWebhookUrl = (projectId: string, secret: string) => {
  const base = (BACKEND_PUBLIC_URL || "http://localhost:8989").replace(/\/$/, "");
  const encodedSecret = encodeURIComponent(secret);
  return `${base}/api/v1/automation/github/pr-opened/${projectId}?key=${encodedSecret}`;
};

const executeTrelloCreateCard = async (
  userId: string,
  projectContext: string,
  trelloListId: string,
  title: string,
  description: string
) => {
  let lastError: any = null;

  for (const actionName of TRELLO_CREATE_CARD_ACTIONS) {
    try {
      const result = await composioService.executeAppAction(
        userId,
        actionName,
        {
          idList: trelloListId,
          listId: trelloListId,
          name: `[PR] ${title}`,
          desc: description,
          description,
        },
        projectContext
      );

      return { actionName, result };
    } catch (error: any) {
      lastError = error;
    }
  }

  throw lastError || new Error("No Trello create-card action succeeded.");
};

/**
 * Configure GitHub PR -> Trello automation for a project.
 */
export const setupGithubPrToTrelloAutomation = async (req: Request, res: Response) => {
  try {
    const {
      projectId,
      githubRepoOwner,
      githubRepoName,
      trelloListId,
      githubWebhookSecret,
    } = req.body || {};
    const { company_object_id, _id: userId } = req.user as any;

    if (!projectId || !githubRepoOwner || !githubRepoName || !trelloListId) {
      return res.status(400).json({
        message:
          "projectId, githubRepoOwner, githubRepoName and trelloListId are required",
      });
    }

    const project = await ProjectModel.findOne({
      _id: projectId,
      company_object_id,
    })
      .select("_id")
      .lean();

    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }

    const secret =
      typeof githubWebhookSecret === "string" && githubWebhookSecret.trim().length >= 12
        ? githubWebhookSecret.trim()
        : randomBytes(24).toString("hex");

    const projectContext = String(projectId);

    const automation = await ProjectAutomationModel.findOneAndUpdate(
      {
        project_object_id: projectId,
        automation_type: AUTOMATION_TYPE,
      },
      {
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
      },
      {
        upsert: true,
        new: true,
        setDefaultsOnInsert: true,
      }
    );

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
        instructions:
          "Add this webhook URL to your GitHub repository webhook settings and select pull_request events.",
      },
    });
  } catch (error: any) {
    console.error("setupGithubPrToTrelloAutomation error:", error);
    return res.status(500).json({
      message: "Failed to configure GitHub PR to Trello automation",
      error: error.message,
    });
  }
};

/**
 * Get automation status for a project.
 */
export const getGithubPrToTrelloAutomationStatus = async (req: Request, res: Response) => {
  try {
    const { projectId } = req.params;
    const { company_object_id } = req.user as any;

    const project = await ProjectModel.findOne({
      _id: projectId,
      company_object_id,
    })
      .select("_id")
      .lean();

    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }

    const automation = await ProjectAutomationModel.findOne({
      project_object_id: projectId,
      automation_type: AUTOMATION_TYPE,
    }).lean();

    return res.status(200).json({
      success: true,
      data: {
        configured: !!automation,
        isActive: !!automation?.is_active,
        githubRepoOwner: automation?.github_repo_owner || null,
        githubRepoName: automation?.github_repo_name || null,
        trelloListId: automation?.trello_list_id || null,
        webhookUrl: automation
          ? buildGithubWebhookUrl(String(projectId), automation.github_webhook_secret)
          : null,
      },
    });
  } catch (error: any) {
    console.error("getGithubPrToTrelloAutomationStatus error:", error);
    return res.status(500).json({
      message: "Failed to fetch automation status",
      error: error.message,
    });
  }
};

/**
 * Public GitHub webhook receiver for PR opened events.
 */
export const handleGithubPrOpenedWebhook = async (req: Request, res: Response) => {
  try {
    const { projectId } = req.params;
    const key = typeof req.query?.key === "string" ? req.query.key : "";

    const automation = await ProjectAutomationModel.findOne({
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

    const action = String(req.body?.action || "").toLowerCase();
    if (action !== "opened") {
      return res.status(202).json({ success: true, message: "Ignored PR action" });
    }

    const pullRequest = req.body?.pull_request;
    const repository = req.body?.repository;
    const sender = req.body?.sender;

    if (!pullRequest || !repository) {
      return res.status(400).json({ message: "Invalid pull_request payload" });
    }

    const prTitle = String(pullRequest.title || `PR #${pullRequest.number || ""}`);
    const prUrl = String(pullRequest.html_url || "");
    const repoFullName = String(
      repository.full_name ||
        `${automation.github_repo_owner}/${automation.github_repo_name}`
    );
    const openedBy = String(sender?.login || "unknown");

    const description = [
      `Repository: ${repoFullName}`,
      `Opened by: ${openedBy}`,
      `Pull Request: ${prUrl}`,
      "",
      `Project Context: ${automation.project_context}`,
    ].join("\n");

    const result = await executeTrelloCreateCard(
      automation.created_by_user_object_id.toString(),
      automation.project_context,
      automation.trello_list_id,
      prTitle,
      description
    );

    return res.status(200).json({
      success: true,
      data: {
        message: "Trello task created from GitHub PR",
        actionName: result.actionName,
      },
    });
  } catch (error: any) {
    console.error("handleGithubPrOpenedWebhook error:", error);
    return res.status(500).json({
      message: "Failed processing GitHub PR webhook",
      error: error.message,
    });
  }
};
