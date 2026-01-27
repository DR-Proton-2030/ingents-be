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
const bank_routes_1 = __importDefault(require("./api/v1/routes/bank/bank.routes"));
const tasks_routes_1 = __importDefault(require("./api/v1/routes/tasks/tasks.routes"));
const taskPhase_routes_1 = __importDefault(require("./api/v1/routes/taskPhase/taskPhase.routes"));
const tag_routes_1 = __importDefault(require("./api/v1/routes/tag/tag.routes"));
const ipTracker_middleware_1 = __importDefault(require("./api/v1/middlewares/ipTracker/ipTracker.middleware"));
const httpLogger_middleware_1 = __importDefault(require("./api/v1/middlewares/ipTracker/httpLogger.middleware"));
const waitList_routes_1 = __importDefault(require("./api/v1/routes/waitlist/waitList.routes"));
const meeting_routes_1 = __importDefault(require("./api/v1/routes/meeting/meeting.routes"));
const project_routes_1 = __importDefault(require("./api/v1/routes/project/project.routes"));
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
app.use("/api/v1/bank", bank_routes_1.default);
app.use("/api/v1/tasks", tasks_routes_1.default);
app.use("/api/v1/task-phase", taskPhase_routes_1.default);
app.use("/api/v1/task-tags", tag_routes_1.default);
app.use("/api/v1/waitlist", waitList_routes_1.default);
app.use("/api/v1/meetings", meeting_routes_1.default);
app.use("/api/v1/projects", project_routes_1.default);
// Default route for health check
app.get("/", (req, res) => {
    res.send(`<h1>Received Successfully</h1>`);
});
exports.default = app;
