import { Request, Response } from "express";
import { Task } from "../../../../types/interface/task.interface";
import TaskModel from "../../../../models/tasks/tasks.model";
import { getTaskService } from "../../../../services/tasks/getTask";
import { IAssignedTask } from "../../../../types/interface/assignedTask.interface";
import AssignedTaskModel from "../../../../models/assignedTask/assignedTask.model";
import mongoose from "mongoose";
import { TASK_STATUSES } from "../../../../constants/taskStatus/taskStatus";



export const createTask = async (req: Request, res: Response) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const {
      title,
      completed = false,
      description = "",
      parent_task_object_id = null,
      due_date = null,
      priority = "Normal",
      status = "pending",
      assigned_user_list,
    } = req.body;

    const { _id: user_object_id, company_object_id } = req.user;

    // Parse assigned_user_list safely
    let parsedAssignedUsers: string[] = [];
    if (Array.isArray(assigned_user_list)) {
      parsedAssignedUsers = assigned_user_list;
    } else if (typeof assigned_user_list === "string") {
      try {
        const parsed = JSON.parse(assigned_user_list);
        parsedAssignedUsers = Array.isArray(parsed) ? parsed : [parsed];
      } catch {
        parsedAssignedUsers = [assigned_user_list];
      }
    }

   
    // Create Task
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
      assigned_user_list: parsedAssignedUsers,
    };

    const newTask = await new TaskModel(newTaskPayload).save({ session });

    // Create Assigned Task entries
    if (parsedAssignedUsers.length > 0) {
      const assignedTasks: IAssignedTask[] = parsedAssignedUsers.map((uid) => ({
        task_object_id: newTask._id,
        assigned_to_user_object_id: uid,
        assigned_by_user_object_id: user_object_id,
        company_object_id: company_object_id!,
        assigned_at: new Date(),
      }));

      await AssignedTaskModel.insertMany(assignedTasks, { session });
    }

    await session.commitTransaction();

    // Populate assigned users using virtual (full_name only)
    const assignedTasks = await AssignedTaskModel.find({ task_object_id: newTask._id })
      .populate("user_details", "full_name") // use virtual
      .lean();

    const responseTask = {
      ...newTask.toObject(),
      assignedTasks,
    };

    res.status(201).json({
      message: "Task created successfully",
      data: responseTask,
    });
  } catch (error) {
    if (session.inTransaction()) await session.abortTransaction();
    console.error("Create Task Error:", error);
    res.status(500).json({ message: "Internal server error" });
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


export const updateTaskStatus = async (req: Request, res: Response) => {
  try {
    const { taskId } = req.params;
    const { status } = req.body;

    if (!Object.values(TASK_STATUSES).includes(status)) {
      return res.status(400).json({
        message: "Invalid task status",
        allowedStatuses: Object.values(TASK_STATUSES),
      });
    }

    const task = await TaskModel.findByIdAndUpdate(
      taskId,
      { status },
      { new: true }
    );

    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }

    return res.status(200).json({
      message: "Task status updated",
      task,
    });
  } catch (error) {
    console.error("Update task status error:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

export const deleteTask = async (req: Request, res: Response) => {
  try {
        const { taskId } = req.params;  
    const task = await TaskModel.findByIdAndDelete(taskId);

    if (!task) {
      return res.status(404).json({ message: "Task not found" });
        }
    return res.status(200).json({
      message: "Task deleted successfully",
    });
  } catch (error) {
    console.error("Delete task error:", error);
    return res.status(500).json({ message: "Server error" });
    } 
};


