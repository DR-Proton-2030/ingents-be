import { Router } from "express";
import { chatWithAssistant } from "../../controller/virtualAssistant/virtualAssistant.controller";
import { userAuth } from "../../middlewares/auth/userAuth";

const virtualAssistantRouter = Router();

virtualAssistantRouter.post("/chat", userAuth, chatWithAssistant);

export default virtualAssistantRouter;
