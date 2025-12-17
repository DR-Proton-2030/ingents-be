import { Request, Response } from "express";
import { Task } from "../../../../types/interface/task.interface";
import TaskModel from "../../../../models/tasks/tasks.model";
import { getTaskService } from "../../../../services/tasks/getTask";

export const createTeask = async (req: Request, res: Response) => {
  try {
    const {
      title,
      completed,
      description,
      parent_task_object_id,
      due_date,
      priority,
      status,
    } = req.body;

    const { _id: user_object_id, company_object_id } = req.user;

    const newTaskPayload: Task = {
      title,
      completed,
      description,
      parent_task_object_id,
      due_date,
      priority,
      progress: 0,
      status,
      created_by_user_object_id: user_object_id,
      company_object_id: company_object_id!,
    };

    const newTask = await new TaskModel(newTaskPayload).save();
    res
      .status(201)
      .json({ message: "Task created successfully", data: newTask });
  } catch (error) {
    res.status(500).json({ message: "Internal server error", error });
  }
};

export const getTasks = async (req: Request, res: Response) => {
  try {
    const { company_object_id } = req.user;
    const { page, limit } = req.query;

    const startIndex = ((Number(page) || 1) - 1) * (Number(limit) || 10);
    const endIndex = startIndex + (Number(limit) || 10);

    const tasks = await getTaskService(
      { company_object_id: company_object_id! },
      startIndex,
      endIndex
    );

    res
      .status(200)
      .json({ message: "Tasks fetched successfully", data: tasks });
  } catch (error) {
    res.status(500).json({ message: "Internal server error", error });
  }
};
