import { Request, Response } from "express";
import mongoose from "mongoose";
import Tag from "../../../../models/tag/tag.model";
import { ITag } from "../../../../types/interface/tag.interface";
import TaskModel from "../../../../models/tasks/tasks.model";

/**
 * Create a new tag
 * @route POST /api/v1/tags
 */
export const createTag = async (req: Request, res: Response) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { name, color } = req.body;
    const { company_object_id } = req.user;

    if (!name) {
      return res.status(400).json({ message: "Tag name is required" });
    }

    // Check if tag with same name exists for this company
    const existingTag = await Tag.findOne({
      company_object_id,
      name: { $regex: new RegExp(`^${name}$`, "i") },
    });

    if (existingTag) {
      await session.abortTransaction();
      return res.status(400).json({
        message: "A tag with this name already exists",
      });
    }

    const newTagPayload: ITag = {
      name,
      color: color || "#3B82F6",
      company_object_id,
    };

    const newTag = await new Tag(newTagPayload).save({ session });

    await session.commitTransaction();

    res.status(201).json({
      message: "Tag created successfully",
      data: newTag,
    });
  } catch (error) {
    if (session.inTransaction()) await session.abortTransaction();
    console.error("Error creating tag:", error);
    res.status(500).json({
      message: "Failed to create tag",
      error,
    });
  } finally {
    session.endSession();
  }
};

/**
 * Get all tags for a company
 * @route GET /api/v1/tags
 */
export const getTags = async (req: Request, res: Response) => {
  try {
    const { company_object_id } = req.user;

    const tags = await Tag.find({ company_object_id }).sort({ createdAt: -1 });

    res.status(200).json({
      message: "Tags retrieved successfully",
      data: tags,
    });
  } catch (error) {
    console.error("Error fetching tags:", error);
    res.status(500).json({
      message: "Failed to fetch tags",
      error,
    });
  }
};

/**
 * Update a tag
 * @route PUT /api/v1/tags/:id
 */
export const updateTag = async (req: Request, res: Response) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { id } = req.params;
    const { name, color } = req.body;
    const { company_object_id } = req.user;

    const tag = await Tag.findOne({
      _id: id,
      company_object_id,
    }).session(session);

    if (!tag) {
      await session.abortTransaction();
      return res.status(404).json({ message: "Tag not found" });
    }

    // Check if trying to rename to an existing tag name
    if (name && name !== tag.name) {
      const existingTag = await Tag.findOne({
        company_object_id,
        name: { $regex: new RegExp(`^${name}$`, "i") },
        _id: { $ne: id },
      }).session(session);

      if (existingTag) {
        await session.abortTransaction();
        return res.status(400).json({
          message: "A tag with this name already exists",
        });
      }
    }

    // Update fields
    if (name) tag.name = name;
    if (color) tag.color = color;

    await tag.save({ session });

    await session.commitTransaction();

    res.status(200).json({
      message: "Tag updated successfully",
      data: tag,
    });
  } catch (error) {
    if (session.inTransaction()) await session.abortTransaction();
    console.error("Error updating tag:", error);
    res.status(500).json({
      message: "Failed to update tag",
      error,
    });
  } finally {
    session.endSession();
  }
};

/**
 * Delete a tag
 * @route DELETE /api/v1/tags/:id
 */
export const deleteTag = async (req: Request, res: Response) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { id } = req.params;
    const { company_object_id } = req.user;

    const tag = await Tag.findOne({
      _id: id,
      company_object_id,
    }).session(session);

    if (!tag) {
      await session.abortTransaction();
      return res.status(404).json({ message: "Tag not found" });
    }

    // Check if any tasks are using this tag
    const tasksUsingTag = await TaskModel.countDocuments({
      tag_object_ids: id,
      company_object_id,
    }).session(session);

    if (tasksUsingTag > 0) {
      await session.abortTransaction();
      return res.status(400).json({
        message: `Cannot delete tag. ${tasksUsingTag} task(s) are using this tag. Please remove it from tasks first.`,
      });
    }

    await Tag.deleteOne({ _id: id }).session(session);

    await session.commitTransaction();

    res.status(200).json({
      message: "Tag deleted successfully",
    });
  } catch (error) {
    if (session.inTransaction()) await session.abortTransaction();
    console.error("Error deleting tag:", error);
    res.status(500).json({
      message: "Failed to delete tag",
      error,
    });
  } finally {
    session.endSession();
  }
};
