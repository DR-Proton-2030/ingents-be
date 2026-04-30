"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const auth_routes_1 = __importDefault(require("./api/v1/routes/auth/auth.routes"));
// import messageRouter from "./api/v1/routes/messages/messages.routes";
const purchasedEmailTemplate_routes_1 = __importDefault(require("./api/v1/routes/purchasedEmailTemplate/purchasedEmailTemplate.routes"));
const sentEmail_routes_1 = __importDefault(require("./api/v1/routes/sentEmail/sentEmail.routes"));
const emailTemplate_routes_1 = __importDefault(require("./api/v1/routes/emailTemplate/emailTemplate.routes"));
const messages_routes_1 = __importDefault(require("./api/v1/routes/messages/messages.routes"));
const facebook_route_1 = __importDefault(require("./api/v1/routes/facebook/facebook.route"));
const user_route_1 = __importDefault(require("./api/v1/routes/user/user.route"));
const instagram_route_1 = __importDefault(require("./api/v1/routes/instagram/instagram.route"));
const youtube_route_1 = __importDefault(require("./api/v1/routes/youtube/youtube.route"));
const x_route_1 = __importDefault(require("./api/v1/routes/x/x.route"));
const bank_routes_1 = __importDefault(require("./api/v1/routes/bank/bank.routes"));
const tasks_routes_1 = __importDefault(require("./api/v1/routes/tasks/tasks.routes"));
const taskPhase_routes_1 = __importDefault(require("./api/v1/routes/taskPhase/taskPhase.routes"));
const tag_routes_1 = __importDefault(require("./api/v1/routes/tag/tag.routes"));
const ipTracker_middleware_1 = __importDefault(require("./api/v1/middlewares/ipTracker/ipTracker.middleware"));
const httpLogger_middleware_1 = __importDefault(require("./api/v1/middlewares/ipTracker/httpLogger.middleware"));
const waitList_routes_1 = __importDefault(require("./api/v1/routes/waitlist/waitList.routes"));
const meeting_routes_1 = __importDefault(require("./api/v1/routes/meeting/meeting.routes"));
const project_routes_1 = __importDefault(require("./api/v1/routes/project/project.routes"));
const scheduler_routes_1 = __importDefault(require("./api/v1/routes/scheduler/scheduler.routes"));
const social_route_1 = __importDefault(require("./api/v1/routes/social/social.route"));
const insights_route_1 = __importDefault(require("./api/v1/routes/insights/insights.route"));
const todo_routes_1 = __importDefault(require("./api/v1/routes/todo/todo.routes"));
const activityLog_routes_1 = __importDefault(require("./api/v1/routes/activityLog/activityLog.routes"));
const campaign_routes_1 = __importDefault(require("./api/v1/routes/campaign/campaign.routes"));
const subscription_routes_1 = __importDefault(require("./api/v1/routes/subscription/subscription.routes"));
const scheduler_service_1 = require("./services/scheduler/scheduler.service");
const insightsSync_service_1 = require("./services/insights/insightsSync.service");
const subscription_worker_1 = require("./services/subscription/subscription.worker");
const composio_routes_1 = __importDefault(require("./api/v1/routes/composio/composio.routes"));
const virtualAssistant_routes_1 = __importDefault(require("./api/v1/routes/virtualAssistant/virtualAssistant.routes"));
const automation_routes_1 = __importDefault(require("./api/v1/routes/automation/automation.routes"));
const app = (0, express_1.default)();
app.use(ipTracker_middleware_1.default);
app.use(httpLogger_middleware_1.default);
app.use((0, cookie_parser_1.default)());
app.use(express_1.default.json({ limit: "20mb" }));
app.use(express_1.default.urlencoded({ limit: "20mb", extended: true }));
// CORS Middleware (Place at the top)
app.use((0, cors_1.default)({
    origin: ["http://localhost:3000", "https://ingents.ai"], // Replace * with frontend origin
    credentials: true,
    allowedHeaders: [
        "Origin",
        "X-Requested-With",
        "Content-Type",
        "Accept",
        "Authorization",
        "token",
    ],
    methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
}));
// Manually handle OPTIONS (Preflight Requests)
app.options("*", (req, res) => {
    res.status(200).send();
});
const whatsapp_routes_1 = __importDefault(require("./api/v1/routes/whatsapp/whatsapp.routes"));
// Routes
app.use("/api/v1/auth", auth_routes_1.default);
app.use("/api/v1/user", user_route_1.default);
app.use("/api/v1/messages", messages_routes_1.default);
app.use("/api/v1/purchased-email-templates", purchasedEmailTemplate_routes_1.default);
app.use("/api/v1/sent-emails", sentEmail_routes_1.default);
app.use("/api/v1/email-templates", emailTemplate_routes_1.default);
app.use("/api/v1/facebook", facebook_route_1.default);
app.use("/api/v1/ig", instagram_route_1.default);
app.use("/api/v1/youtube", youtube_route_1.default);
app.use("/api/v1/x", x_route_1.default);
app.use("/api/v1/whatsapp", whatsapp_routes_1.default);
app.use("/api/v1/bank", bank_routes_1.default);
app.use("/api/v1/tasks", tasks_routes_1.default);
app.use("/api/v1/task-phase", taskPhase_routes_1.default);
app.use("/api/v1/task-tags", tag_routes_1.default);
app.use("/api/v1/waitlist", waitList_routes_1.default);
app.use("/api/v1/meetings", meeting_routes_1.default);
app.use("/api/v1/projects", project_routes_1.default);
app.use("/api/v1/scheduler", scheduler_routes_1.default);
app.use("/api/v1/social", social_route_1.default);
app.use("/api/v1/insights", insights_route_1.default);
app.use("/api/v1/todos", todo_routes_1.default);
app.use("/api/v1/activity", activityLog_routes_1.default);
app.use("/api/v1/campaign", campaign_routes_1.default);
app.use("/api/v1/subscription", subscription_routes_1.default);
app.use("/api/v1/integrations", composio_routes_1.default);
app.use("/api/v1/virtual-assistant", virtualAssistant_routes_1.default);
app.use("/api/v1/automation", automation_routes_1.default);
// Initialize BullMQ Worker for Social Media Scheduler (async, non-blocking)
(0, scheduler_service_1.initializeWorker)()
    .then((worker) => {
    if (worker) {
        console.log("\x1b[32m \x1b[1m[BullMQ] Social Media Scheduler Worker initialized\x1b[0m");
    }
})
    .catch((error) => {
    console.warn("\x1b[33m[BullMQ] Scheduler initialization skipped\x1b[0m");
});
// Initialize BullMQ Worker for Insights Sync (async, non-blocking)
(0, insightsSync_service_1.initializeInsightsWorker)()
    .then((worker) => {
    if (worker) {
        console.log("\x1b[32m \x1b[1m[BullMQ] Insights Sync Worker initialized\x1b[0m");
    }
})
    .catch((error) => {
    console.warn("\x1b[33m[BullMQ] Insights Sync initialization skipped\x1b[0m");
});
// Initialize BullMQ Worker for Subscription Management (async, non-blocking)
(0, subscription_worker_1.initializeSubscriptionWorker)()
    .then((worker) => {
    if (worker) {
        console.log("\x1b[32m \x1b[1m[BullMQ] Subscription Worker initialized\x1b[0m");
    }
})
    .catch((error) => {
    console.warn("\x1b[33m[BullMQ] Subscription Worker initialization skipped\x1b[0m");
});
// Default route for health check
app.get("/", (req, res) => {
    res.send(`<h1>Received Successfully</h1>`);
});
exports.default = app;
