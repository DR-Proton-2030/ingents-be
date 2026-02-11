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
exports.runAgentExecutor = void 0;
const agentRun_model_1 = __importDefault(require("../../../models/agentRun/agentRun.model"));
const defaultPlanner = (goal, maxSteps = 5) => {
    const normalized = goal.toLowerCase();
    const steps = [];
    const addStep = (action, input) => {
        steps.push({
            id: `step-${steps.length + 1}`,
            action,
            input,
            status: "pending",
        });
    };
    if (normalized.includes("email")) {
        addStep("generate_email", { tone: "professional" });
        addStep("send_email");
    }
    if (normalized.includes("post") || normalized.includes("social")) {
        addStep("schedule_social_post");
    }
    if (normalized.includes("meeting") || normalized.includes("calendar")) {
        addStep("schedule_meeting");
    }
    if (steps.length === 0) {
        addStep("summarize_goal");
    }
    return steps.slice(0, maxSteps);
};
const runAction = (action, goal, context) => __awaiter(void 0, void 0, void 0, function* () {
    switch (action) {
        case "summarize_goal":
            return `Goal summary: ${goal}`;
        case "generate_email":
            return {
                subject: "Draft: Request from Ingents Agent",
                body: `Hello,\n\nHere is a draft based on the goal: ${goal}\n\nRegards,\nIngents Agent`,
            };
        case "send_email":
            return {
                mode: "simulated",
                to: (context === null || context === void 0 ? void 0 : context.email_to) || "unknown@domain.com",
                status: "queued",
            };
        case "schedule_social_post":
            return {
                mode: "simulated",
                platform: (context === null || context === void 0 ? void 0 : context.platform) || "x",
                scheduled_at: (context === null || context === void 0 ? void 0 : context.scheduled_at) || new Date().toISOString(),
                content: (context === null || context === void 0 ? void 0 : context.post_content) || `Automated post for goal: ${goal}`,
            };
        case "schedule_meeting":
            return {
                mode: "simulated",
                title: `Meeting about: ${goal}`,
                scheduled_at: (context === null || context === void 0 ? void 0 : context.meeting_time) || new Date().toISOString(),
            };
        default:
            return {
                mode: "skipped",
                reason: `No handler for action ${action}`,
            };
    }
});
const finalizeSummary = (steps) => {
    const completed = steps.filter((step) => step.status === "completed").length;
    const failed = steps.filter((step) => step.status === "failed").length;
    const skipped = steps.filter((step) => step.status === "skipped").length;
    return `Steps completed: ${completed}, failed: ${failed}, skipped: ${skipped}.`;
};
const runAgentExecutor = (input) => __awaiter(void 0, void 0, void 0, function* () {
    const { goal, context = {}, options = {}, user } = input;
    const started_at = new Date();
    const steps = defaultPlanner(goal, options.maxSteps || 5);
    const allowedActions = options.allowedActions;
    const isDryRun = Boolean(options.dryRun);
    let runId;
    let overallStatus = isDryRun ? "dry_run" : "running";
    let error = null;
    if (!isDryRun && (user === null || user === void 0 ? void 0 : user.user_object_id) && (user === null || user === void 0 ? void 0 : user.company_object_id)) {
        const runRecord = yield agentRun_model_1.default.create({
            goal,
            status: overallStatus,
            steps: [],
            context,
            user_object_id: user.user_object_id,
            company_object_id: user.company_object_id,
            started_at,
        });
        runId = String(runRecord._id);
    }
    for (const step of steps) {
        if (allowedActions && !allowedActions.includes(step.action)) {
            step.status = "skipped";
            step.result = { reason: "Action not allowed" };
            continue;
        }
        step.status = "running";
        step.started_at = new Date();
        try {
            const result = yield runAction(step.action, goal, context);
            step.result = result;
            step.status = "completed";
        }
        catch (actionError) {
            step.status = "failed";
            step.error =
                actionError instanceof Error
                    ? { message: actionError.message }
                    : { message: "Unknown action error" };
            overallStatus = "failed";
            error = step.error;
            break;
        }
        finally {
            step.finished_at = new Date();
        }
    }
    if (overallStatus !== "failed") {
        overallStatus = isDryRun ? "dry_run" : "completed";
    }
    const finished_at = new Date();
    const summary = finalizeSummary(steps);
    if (runId) {
        yield agentRun_model_1.default.findByIdAndUpdate(runId, {
            status: overallStatus,
            steps,
            summary,
            finished_at,
            error,
        });
    }
    return {
        runId,
        goal,
        status: overallStatus,
        steps,
        summary,
        started_at,
        finished_at,
    };
});
exports.runAgentExecutor = runAgentExecutor;
