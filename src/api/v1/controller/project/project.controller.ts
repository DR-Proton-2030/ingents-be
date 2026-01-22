import { Request, Response } from "express";
import ProjectModel from "../../../../models/project/project.model";

/**
 * Create a new project
 */
export const createProject = async (req: Request, res: Response) => {
  try {
    const { name, detail } = req.body;
    const { _id: user_object_id, company_object_id } = req.user;

    if (!name || !detail) {
      return res.status(400).json({ message: "Name and detail are required" });
    }

    const newProject = new ProjectModel({
      name,
      detail,
      company_object_id,
      created_by_user_object_id: user_object_id,
    });

    await newProject.save();

    res.status(201).json({
      message: "Project created successfully",
      data: newProject,
    });
  } catch (error) {
    console.error("Create Project Error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

/**
 * Get all projects for the company
 */
export const getProjects = async (req: Request, res: Response) => {
  try {
    const { company_object_id } = req.user;
    const { page = 1, limit = 30 } = req.query;

    const currentPage = Number(page);
    const pageLimit = Number(limit);
    const skip = (currentPage - 1) * pageLimit;

    const query = { company_object_id };

    const [projects, totalCount] = await Promise.all([
      ProjectModel.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(pageLimit),
      ProjectModel.countDocuments(query),
    ]);

    res.status(200).json({
      message: "Projects fetched successfully",
      data: projects,
      pagination: {
        currentPage,
        totalCount,
        totalPages: Math.ceil(totalCount / pageLimit),
      },
    });
  } catch (error) {
    console.error("Get Projects Error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

/**
 * Update project details
 */
export const updateProject = async (req: Request, res: Response) => {
  try {
    const { projectId } = req.params;
    const { company_object_id } = req.user;
    const updateData = req.body;

    const updatedProject = await ProjectModel.findOneAndUpdate(
      { _id: projectId, company_object_id },
      updateData,
      { new: true }
    );

    if (!updatedProject) {
      return res.status(404).json({ message: "Project not found" });
    }

    res.status(200).json({
      message: "Project updated successfully",
      data: updatedProject,
    });
  } catch (error) {
    console.error("Update Project Error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

/**
 * Delete a project
 */
export const deleteProject = async (req: Request, res: Response) => {
  try {
    const { projectId } = req.params;
    const { company_object_id } = req.user;

    const deletedProject = await ProjectModel.findOneAndDelete({
      _id: projectId,
      company_object_id,
    });

    if (!deletedProject) {
      return res.status(404).json({ message: "Project not found" });
    }

    res.status(200).json({ message: "Project deleted successfully" });
  } catch (error) {
    console.error("Delete Project Error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};
