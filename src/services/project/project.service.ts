import Project from "../../models/project/project.model";
import { IProject } from "../../types/interface/project.interface";

export const createProjectService = async (data: IProject) => {
  return await Project.create(data);
};

export const getProjectsService = async () => {
  return await Project.find();
};
