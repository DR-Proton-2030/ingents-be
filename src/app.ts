import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import authRouter from "./api/v1/routes/auth/auth.routes";
// import messageRouter from "./api/v1/routes/messages/messages.routes";
import purchasedEmailTemplateRouter from "./api/v1/routes/purchasedEmailTemplate/purchasedEmailTemplate.routes";
import sentEmailRouter from "./api/v1/routes/sentEmail/sentEmail.routes";
import emailTemplateRouter from "./api/v1/routes/emailTemplate/emailTemplate.routes";
import messageRouter from "./api/v1/routes/messages/messages.routes";
import Facebookrouter from "./api/v1/routes/facebook/facebook.route";
import userRouter from "./api/v1/routes/user/user.route";
import instagramRouter from "./api/v1/routes/instagram/instagram.route";
import youtubeRouter from "./api/v1/routes/youtube/youtube.route";
import xRouter from "./api/v1/routes/x/x.route";
import bankRouter from "./api/v1/routes/bank/bank.routes";
import taskRouter from "./api/v1/routes/tasks/tasks.routes";
import taskPhaseRouter from "./api/v1/routes/taskPhase/taskPhase.routes";
import tagRouter from "./api/v1/routes/tag/tag.routes";
import ipTrackerMiddleware from "./api/v1/middlewares/ipTracker/ipTracker.middleware";
import httpLoggerMiddleware from "./api/v1/middlewares/ipTracker/httpLogger.middleware";
import waitListRouter from "./api/v1/routes/waitlist/waitList.routes";
import meetingRouter from "./api/v1/routes/meeting/meeting.routes";
import projectRouter from "./api/v1/routes/project/project.routes";
import schedulerRouter from "./api/v1/routes/scheduler/scheduler.routes";
import socialRouter from "./api/v1/routes/social/social.route";
import insightsRouter from "./api/v1/routes/insights/insights.route";
import { initializeWorker } from "./services/scheduler/scheduler.service";
import { initializeInsightsWorker } from "./services/insights/insightsSync.service";

const app = express();

app.use(ipTrackerMiddleware);
app.use(httpLoggerMiddleware);

app.use(cookieParser());
app.use(express.json({ limit: "20mb" }));
app.use(express.urlencoded({ limit: "20mb", extended: true }));

// CORS Middleware (Place at the top)
app.use(
  cors({
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
  }),
);

// Manually handle OPTIONS (Preflight Requests)
app.options("*", (req, res) => {
  res.status(200).send();
});

// Routes
app.use("/api/v1/auth", authRouter);
app.use("/api/v1/user", userRouter);
app.use("/api/v1/messages", messageRouter);
app.use("/api/v1/purchased-email-templates", purchasedEmailTemplateRouter);
app.use("/api/v1/sent-emails", sentEmailRouter);
app.use("/api/v1/email-templates", emailTemplateRouter);
app.use("/api/v1/facebook", Facebookrouter);
app.use("/api/v1/ig", instagramRouter);
app.use("/api/v1/youtube", youtubeRouter);
app.use("/api/v1/x", xRouter);
app.use("/api/v1/bank", bankRouter);
app.use("/api/v1/tasks", taskRouter);
app.use("/api/v1/task-phase", taskPhaseRouter);
app.use("/api/v1/task-tags", tagRouter);
app.use("/api/v1/waitlist", waitListRouter);
app.use("/api/v1/meetings", meetingRouter);
app.use("/api/v1/projects", projectRouter);
app.use("/api/v1/scheduler", schedulerRouter);
app.use("/api/v1/social", socialRouter);
app.use("/api/v1/insights", insightsRouter);

// Initialize BullMQ Worker for Social Media Scheduler (async, non-blocking)
initializeWorker()
  .then((worker) => {
    if (worker) {
      console.log(
        "\x1b[32m \x1b[1m[BullMQ] Social Media Scheduler Worker initialized\x1b[0m",
      );
    }
  })
  .catch((error) => {
    console.warn("\x1b[33m[BullMQ] Scheduler initialization skipped\x1b[0m");
  });

// Initialize BullMQ Worker for Insights Sync (async, non-blocking)
initializeInsightsWorker()
  .then((worker) => {
    if (worker) {
      console.log(
        "\x1b[32m \x1b[1m[BullMQ] Insights Sync Worker initialized\x1b[0m",
      );
    }
  })
  .catch((error) => {
    console.warn("\x1b[33m[BullMQ] Insights Sync initialization skipped\x1b[0m");
  });

// Default route for health check
app.get("/", (req, res) => {
  res.send(`<h1>Received Successfully</h1>`);
});

export default app;
