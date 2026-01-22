import mongoose from "mongoose";
import { projectSchema } from "./project.schema";
import { IProject } from "../../types/interface/project.interface";

const ProjectModel = mongoose.model<IProject>("Project", projectSchema);

export default ProjectModel;
