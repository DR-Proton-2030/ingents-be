import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import authRouter from "./api/v1/routes/auth/auth.routes";
import fileHandleRouter from "./api/v1/routes/fileHandling/fileHandling.routes"
import { chatRouter } from "./api/v1/routes/chatRoutes/chatRoutes";
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
app.use("/api/v1/fileHandling", fileHandleRouter);
app.use("/api/v1/chat", chatRouter);

// Default route for health check
app.get("/", (req, res) => {
  res.send(`<h1>Received Successfully</h1>`);
});

export default app;
