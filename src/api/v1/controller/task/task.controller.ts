import { Request, Response } from "express";
import UserModel from "../../../../models/users/users.model";
import { Task } from "../../../../types/interface/task.interface";
import TaskModel from "../../../../models/tasks/tasks.model";
import { getTaskService } from "../../../../services/tasks/getTask";
import {
  AssignedTaskWithUser,
  IAssignedTask,
} from "../../../../types/interface/assignedTask.interface";
import AssignedTaskModel from "../../../../models/assignedTask/assignedTask.model";
import mongoose, { Types } from "mongoose";
import { callMailServer } from "../../../../services/callMailServer/callMailServer";
import TaskPhase from "../../../../models/taskPhase/taskPhase.model";

// export const createTask = async (req: Request, res: Response) => {
//   const session = await mongoose.startSession();
//   session.startTransaction();

//   try {
//     const {
//       title,
//       completed = false,
//       description = "",
//       parent_task_object_id = null,
//       due_date = null,
//       priority = "Normal",
//       status = "pending",
//       assigned_user_list,
//     } = req.body;

//     const { _id: user_object_id, company_object_id } = req.user;

//     // Parse assigned_user_list safely
//     let parsedAssignedUsers: string[] = [];
//     if (Array.isArray(assigned_user_list)) {
//       parsedAssignedUsers = assigned_user_list;
//     } else if (typeof assigned_user_list === "string") {
//       try {
//         const parsed = JSON.parse(assigned_user_list);
//         parsedAssignedUsers = Array.isArray(parsed) ? parsed : [parsed];
//       } catch {
//         parsedAssignedUsers = [assigned_user_list];
//       }
//     }

//     // Create Task
//     const newTaskPayload: Task = {
//       title,
//       completed,
//       description,
//       parent_task_object_id,
//       due_date,
//       priority,
//       progress: 0,
//       status,
//       created_by_user_object_id: user_object_id,
//       company_object_id: company_object_id!,
//       assigned_user_list: parsedAssignedUsers,
//     };

//     const newTask = await new TaskModel(newTaskPayload).save({ session });

//     // Create Assigned Task entries
//     if (parsedAssignedUsers.length > 0) {
//       const assignedTasks: IAssignedTask[] = parsedAssignedUsers.map((uid) => ({
//         task_object_id: newTask._id,
//         assigned_to_user_object_id: uid,
//         assigned_by_user_object_id: user_object_id,
//         company_object_id: company_object_id!,
//         assigned_at: new Date(),
//       }));

//       await AssignedTaskModel.insertMany(assignedTasks, { session });
//     }

//     await session.commitTransaction();

//     // Populate assigned users using virtual (full_name only)
//     const assignedTasks = await AssignedTaskModel.find({ task_object_id: newTask._id })
//       .populate("user_details", "full_name") // use virtual
//       .lean();

//     const responseTask = {
//       ...newTask.toObject(),
//       assignedTasks,
//     };

//     res.status(201).json({
//       message: "Task created successfully",
//       data: responseTask,
//     });
//   } catch (error) {
//     if (session.inTransaction()) await session.abortTransaction();
//     console.error("Create Task Error:", error);
//     res.status(500).json({ message: "Internal server error" });
//   } finally {
//     session.endSession();
//   }
// };

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
      phase_object_id,
      assigned_user_list,
    } = req.body;

    console.log("Phase Object Id : ", phase_object_id);

    const { _id: user_object_id, company_object_id } = req.user;

    if (!title) {
      return res.status(400).json({ message: "Task title is required" });
    }

    // Get phase_object_id: use provided one or default to "Not Started" phase
    let taskPhaseId = phase_object_id;
    if (!taskPhaseId) {
      const defaultPhase = await TaskPhase.findOne({
        company_object_id,
        name: "Not Started",
      }).session(session);

      if (!defaultPhase) {
        await session.abortTransaction();
        return res.status(400).json({
          message:
            "No default task phase found. Please create task phases first.",
        });
      }
      taskPhaseId = defaultPhase._id;
    }

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

    const newTaskPayload: Task = {
      title,
      completed,
      description,
      parent_task_object_id,
      due_date,
      priority,
      progress: 0,
      phase_object_id: taskPhaseId,
      created_by_user_object_id: user_object_id,
      company_object_id: company_object_id!,
      assigned_user_list: parsedAssignedUsers,
    };

    const newTask = await new TaskModel(newTaskPayload).save({ session });

    // Create AssignedTask entries
    if (parsedAssignedUsers.length > 0) {
      const assignedTasksPayload: IAssignedTask[] = parsedAssignedUsers.map(
        (uid) => ({
          task_object_id: newTask._id,
          assigned_to_user_object_id: uid,
          assigned_by_user_object_id: user_object_id,
          company_object_id: company_object_id!,
          assigned_at: new Date(),
        }),
      );

      await AssignedTaskModel.insertMany(assignedTasksPayload, { session });
    }

    await session.commitTransaction();

    // 🔹 Fetch assigned users (email + name)
    const assignedTasks = await AssignedTaskModel.find({
      task_object_id: newTask._id,
    })
      .populate("user_details", "full_name email")
      .lean<AssignedTaskWithUser[]>();

    const assigningUser = await UserModel.findById(user_object_id)
      .select("full_name")
      .lean();

    const assignedByName =
      typeof assigningUser?.full_name === "string"
        ? assigningUser.full_name
        : "Admin";

    // Send Task Assignment Emails
    if (assignedTasks.length > 0) {
      await Promise.all(
        assignedTasks.map(async (assigned) => {
          const user = assigned.user_details;

          if (!user?.email) return;

          try {
            await callMailServer("task-assignment", {
              email: user.email,
              user_name: user.full_name,
              taskTitle: newTask.title,
              assignedBy: assignedByName || "Admin",
            });
          } catch (mailError) {
            console.error(
              `❌ Failed to send task mail to ${user.email}`,
              mailError,
            );
          }
        }),
      );
    }

    res.status(201).json({
      message: "Task created successfully",
      data: {
        ...newTask.toObject(),
        assignedTasks,
      },
    });
  } catch (error) {
    if (session.inTransaction()) await session.abortTransaction();
    console.error("❌ Create Task Error:", error);

    res.status(500).json({
      message: "Internal server error",
    });
  } finally {
    session.endSession();
  }
};

export const getTasks = async (req: Request, res: Response) => {
  try {
    const { company_object_id } = req.user;
    const { page, limit } = req.query;

    const startIndex = ((Number(page) || 1) - 1) * (Number(limit) || 10);
    const endIndex = startIndex + (Number(limit) || 30);

    const tasks = await getTaskService(
      { company_object_id: company_object_id! },
      startIndex,
      endIndex,
    );

    // console.log("Task : ", tasks);

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
    const { phase_object_id } = req.body;
    const { company_object_id } = req.user;

    if (!phase_object_id) {
      return res.status(400).json({
        message: "phase_object_id is required",
      });
    }

    // Verify the phase exists and belongs to the company
    const phase = await TaskPhase.findOne({
      _id: phase_object_id,
      company_object_id,
    });

    if (!phase) {
      return res.status(400).json({
        message: "Invalid task phase or phase does not belong to your company",
      });
    }

    const task = await TaskModel.findByIdAndUpdate(
      taskId,
      { phase_object_id },
      { new: true },
    ).populate("phase_info");

    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }

    return res.status(200).json({
      message: "Task phase updated",
      task,
    });
  } catch (error) {
    console.error("Update task phase error:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

export const assignTaskToUser = async (req: Request, res: Response) => {
  try {
    const { taskId, userId } = req.params;
    const { _id: user_object_id } = req.user;

    // Check if user exists
    const user = await UserModel.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    //  Assign user to task
    const task = await TaskModel.findByIdAndUpdate(
      taskId,
      { $addToSet: { assigned_user_list: userId } }, // prevent duplicates
      { new: true },
    ).populate("assigned_users_info", "full_name email");

    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }
    const assigningUser = await UserModel.findById(user_object_id)
      .select("full_name")
      .lean();

    const assignedByName =
      typeof assigningUser?.full_name === "string"
        ? assigningUser.full_name
        : "Admin";

    try {
      await callMailServer("task-assignment", {
        email: user.email,
        user_name: user.full_name,
        taskTitle: task.title,
        assignedBy: assignedByName || "Admin",
      });
      console.log(`✅ Email sent to ${user.email}`);
    } catch (mailError) {
      console.error("Error sending email:", mailError);
    }

    return res.status(200).json({
      message: "User assigned successfully",
      taskId,
      assignees: task.assigned_users_info,
    });
  } catch (error) {
    console.error("Assign user error:", error);
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

export const unassignTaskFromUser = async (req: Request, res: Response) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { taskId, userId } = req.params;
    const { _id: user_object_id, company_object_id } = req.user;

    if (!taskId || !userId) {
      return res.status(400).json({
        message: "taskId and userId are required",
      });
    }

    // Check if user exists
    const user = await UserModel.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Ensure task exists & belongs to company
    const task = await TaskModel.findOne({
      _id: taskId,
      company_object_id,
    }).session(session);

    if (!task) {
      return res.status(404).json({
        message: "Task not found",
      });
    }

    // Remove user from task.assigned_user_list
    await TaskModel.updateOne(
      { _id: taskId },
      { $pull: { assigned_user_list: userId } },
      { session },
    );

    // 3️⃣ Delete assigned task record
    await AssignedTaskModel.deleteOne(
      {
        task_object_id: taskId,
        assigned_to_user_object_id: userId,
        company_object_id,
      },
      { session },
    );

    await session.commitTransaction();

    const assigningUser = await UserModel.findById(user_object_id)
      .select("full_name")
      .lean();

    const assignedByName =
      typeof assigningUser?.full_name === "string"
        ? assigningUser.full_name
        : "Admin";

    try {
      await callMailServer("task-unassignment", {
        email: user.email,
        user_name: user.full_name,
        taskTitle: task.title,
        assignedBy: assignedByName || "Admin",
      });
      console.log(`✅ Email sent to ${user.email}`);
    } catch (mailError) {
      console.error("Error sending email:", mailError);
    }
    return res.status(200).json({
      message: "User unassigned from task successfully",
    });
  } catch (error) {
    if (session.inTransaction()) {
      await session.abortTransaction();
    }

    console.error("Unassign Task Error:", error);
    return res.status(500).json({
      message: "Internal server error",
    });
  } finally {
    session.endSession();
  }
};

export const editTask = async (req: Request, res: Response) => {
  try {
    const { taskId } = req.params;
    const updateData = req.body;
    const updatedTask = await TaskModel.findByIdAndUpdate(taskId, updateData, {
      new: true,
    });
    if (!updatedTask) {
      return res.status(404).json({ message: "Task not found" });
    }
    res.status(200).json({
      message: "Task updated successfully",
      data: updatedTask,
    });
  } catch (error) {
    console.error("Edit Task Error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};
