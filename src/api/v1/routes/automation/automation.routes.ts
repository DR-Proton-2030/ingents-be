import { Router } from "express";
import {
  getGithubPrToTrelloAutomationStatus,
  handleGithubPrOpenedWebhook,
  setupGithubPrToTrelloAutomation,
} from "../../controller/automation/automation.controller";
import { userAuth } from "../../middlewares/auth/userAuth";

const automationRouter = Router();

automationRouter.post(
  "/github-pr-to-trello/setup",
  userAuth,
  setupGithubPrToTrelloAutomation
);

automationRouter.get(
  "/github-pr-to-trello/:projectId",
  userAuth,
  getGithubPrToTrelloAutomationStatus
);

automationRouter.post("/github/pr-opened/:projectId", handleGithubPrOpenedWebhook);

export default automationRouter;
