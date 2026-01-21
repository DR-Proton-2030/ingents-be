import { Router } from "express";
import {
  createTaskPhase,
  getTaskPhases,
  // getTaskPhaseById,
  updateTaskPhase,
  // deleteTaskPhase,
  // reorderTaskPhases,
} from "../../controller/taskPhase/taskPhase.controller";
import { userAuth } from "../../middlewares/auth/userAuth";

const taskPhaseRouter = Router();

taskPhaseRouter.post("/create", userAuth, createTaskPhase);
taskPhaseRouter.get("/list", userAuth, getTaskPhases);
// taskPhaseRouter.get("/:id", userAuth, getTaskPhaseById);
taskPhaseRouter.patch("/update/:id", userAuth, updateTaskPhase);
// taskPhaseRouter.delete("/delete/:id", userAuth, deleteTaskPhase);
// taskPhaseRouter.put("/reorder", userAuth, reorderTaskPhases);

export default taskPhaseRouter;
