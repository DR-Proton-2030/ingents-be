import { Router } from "express";
import { createTeask, getTasks } from "../../controller/task/task.controller";
import { userAuth } from "../../middlewares/auth/userAuth";

const taskRouter = Router();

taskRouter.patch("/create-task", userAuth, createTeask);
taskRouter.get("/get-tasks", userAuth, getTasks);

export default taskRouter;
