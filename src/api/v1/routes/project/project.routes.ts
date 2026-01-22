import { Router } from "express";
import {
  createProject,
  getProjects,
  updateProject,
  deleteProject,
} from "../../controller/project/project.controller";
import { userAuth } from "../../middlewares/auth/userAuth";

const projectRouter = Router();

projectRouter.post("/create-project", userAuth, createProject);
projectRouter.get("/get-projects", userAuth, getProjects);
projectRouter.patch("/update-project/:projectId", userAuth, updateProject);
projectRouter.delete("/delete-project/:projectId", userAuth, deleteProject);

export default projectRouter;
