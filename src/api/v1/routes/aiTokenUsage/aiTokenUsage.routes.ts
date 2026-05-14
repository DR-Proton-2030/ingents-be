import express from "express";
import { getAITokenUsage } from "../../controller/aiTokenUsage/aiTokenUsage.controller";
import { userAuth } from "../../middlewares/auth/userAuth";

const aiTokenUsageRouter = express.Router();

aiTokenUsageRouter.use(userAuth);
aiTokenUsageRouter.get("/", getAITokenUsage);

export default aiTokenUsageRouter;
