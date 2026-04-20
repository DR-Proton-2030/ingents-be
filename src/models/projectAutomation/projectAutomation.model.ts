import mongoose from "mongoose";
import { IProjectAutomation } from "../../types/interface/projectAutomation.interface";
import { projectAutomationSchema } from "./projectAutomation.schema";

const ProjectAutomationModel = mongoose.model<IProjectAutomation>(
  "project_automations",
  projectAutomationSchema
);

export default ProjectAutomationModel;
