import { Router } from "express";
import {
    getIntegrations,
    initiateConnection,
    executeAction
} from "../../controller/composio/composio.controller";
import { userAuth } from "../../middlewares/auth/userAuth";

const composioRouter = Router();

composioRouter.get("/list", userAuth, getIntegrations);
composioRouter.post("/connect", userAuth, initiateConnection);
composioRouter.post("/execute", userAuth, executeAction);

export default composioRouter;
