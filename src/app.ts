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
import userRouter from "./api/v1/routes/user.route";
import instagramRouter from "./api/v1/routes/instagram/instagram.route";
import youtubeRouter from "./api/v1/routes/youtube/youtube.route";
const app = express();

app.use(cookieParser());
app.use(express.json({ limit: "20mb" }));
app.use(express.urlencoded({ limit: "20mb", extended: true }));

// CORS Middleware (Place at the top)
app.use(
  cors({
    origin: ["http://localhost:3000"], // Replace * with frontend origin
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
  })
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
app.use("/api/v1/fa", Facebookrouter);
app.use("/api/v1/ig", instagramRouter);
app.use("/api/v1/youtube", youtubeRouter);

// Default route for health check
app.get("/", (req, res) => {
  res.send(`<h1>Received Successfully</h1>`);
});

export default app;
