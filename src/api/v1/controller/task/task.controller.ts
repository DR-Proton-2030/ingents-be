import { Request, Response } from "express";
import { Task } from "../../../../types/interface/task.interface";
import TaskModel from "../../../../models/tasks/tasks.model";
import { getTaskService } from "../../../../services/tasks/getTask";
import { IAssignedTask } from "../../../../types/interface/assignedTask.interface";
import AssignedTaskModel from "../../../../models/assignedTask/assignedTask.model";

export const createTeask = async (req: Request, res: Response) => {
    const session = await TaskModel.db.startSession();
    session.startTransaction();
    try {
        const {
            title,
            completed,
            description,
            parent_task_object_id,
            due_date,
            priority,
            status,
            assigned_user_list,
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

        const newTask = new TaskModel(newTaskPayload);
        const assignedTaskList: IAssignedTask[] = [];

        if (assigned_user_list && assigned_user_list.length > 0) {
            for (const assignedUserId of assigned_user_list) {
                const assignTaskPayload: IAssignedTask = {
                    task_object_id: newTask._id,
                    assigned_to_user_object_id: assignedUserId,
                    company_object_id: company_object_id!,
                    assigned_by_user_object_id: user_object_id,
                    assigned_at: new Date(),
                };
                assignedTaskList.push(assignTaskPayload);
            }
        }

        await newTask.save({ session });
        if (assignedTaskList.length > 0) {
            await AssignedTaskModel.insertMany(assignedTaskList, { session });
        }

        await session.commitTransaction();
        res
            .status(201)
            .json({ message: "Task created successfully", data: newTask });
    } catch (error) {
        if (session.inTransaction()) await session.abortTransaction();
        res.status(500).json({ message: "Internal server error", error });
    } finally {
        session.endSession();
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
