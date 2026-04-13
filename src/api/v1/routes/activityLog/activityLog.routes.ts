import { Router } from "express";
import { getActivities } from "../../controller/activityLog/activityLog.controller";
import { userAuth } from "../../middlewares/auth/userAuth";

const activityLogRouter = Router();

activityLogRouter.get("/get-activities", userAuth, getActivities);

export default activityLogRouter;
