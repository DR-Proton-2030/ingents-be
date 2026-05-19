import { Request, Response } from "express";
import UserModel from "../../../../models/users/users.model";
import {
  Task,
  TaskAttachment,
} from "../../../../types/interface/task.interface";
import TaskModel from "../../../../models/tasks/tasks.model";
import { getTaskService } from "../../../../services/tasks/getTask";
import {
  AssignedTaskWithUser,
  IAssignedTask,
} from "../../../../types/interface/assignedTask.interface";
import AssignedTaskModel from "../../../../models/assignedTask/assignedTask.model";
import mongoose, { Types } from "mongoose";
import { callMailServer } from "../../../../services/callMailServer/callMailServer";
import { logActivity } from "../../../../services/activityLog/activityLog.service";
import TaskPhase from "../../../../models/taskPhase/taskPhase.model";

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
      attachments = [], // Can be URLs from fileUploadHelper or array of {url, description}
      attachment_descriptions = [], // Optional descriptions for each attachment
      tag_object_ids = [], // Array of tag IDs
      project_object_id = null,
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

    // Parse attachments (handle multiple formats)
    let parsedExistingAttachments: TaskAttachment[] = [];
    if (req.body.existing_attachments) {
      try {
        const parsed = typeof req.body.existing_attachments === "string"
          ? JSON.parse(req.body.existing_attachments)
          : req.body.existing_attachments;
        if (Array.isArray(parsed)) {
          parsedExistingAttachments = parsed.map(att => ({
            url: att.url || "",
            description: att.description || ""
          }));
        }
      } catch (err) {
        console.error("Failed to parse existing_attachments:", err);
      }
    }

    let parsedNewAttachments: TaskAttachment[] = [];
    let descriptions: string[] = [];
    if (Array.isArray(attachment_descriptions)) {
      descriptions = attachment_descriptions;
    } else if (typeof attachment_descriptions === "string") {
      try {
        const parsed = JSON.parse(attachment_descriptions);
        descriptions = Array.isArray(parsed) ? parsed : [parsed];
      } catch {
        descriptions = [attachment_descriptions];
      }
    }

    if (Array.isArray(attachments)) {
      parsedNewAttachments = attachments.map((att, index) => {
        if (typeof att === "object" && att.url) {
          return { url: att.url, description: att.description || "" };
        }
        if (typeof att === "string") {
          return { url: att, description: descriptions[index] || "" };
        }
        return { url: String(att), description: "" };
      });
    } else if (typeof attachments === "string") {
      try {
        const parsed = JSON.parse(attachments);
        if (Array.isArray(parsed)) {
          parsedNewAttachments = parsed.map((att, index) => {
            if (typeof att === "object" && att.url) {
              return { url: att.url, description: att.description || "" };
            }
            return { url: String(att), description: descriptions[index] || "" };
          });
        } else if (typeof parsed === "object" && parsed.url) {
          parsedNewAttachments = [
            { url: parsed.url, description: parsed.description || "" },
          ];
        } else {
          parsedNewAttachments = [
            { url: attachments, description: descriptions[0] || "" },
          ];
        }
      } catch {
        parsedNewAttachments = [
          { url: attachments, description: descriptions[0] || "" },
        ];
      }
    }

    const parsedAttachments = [...parsedExistingAttachments, ...parsedNewAttachments];

    // Parse tag_object_ids
    let parsedTags: string[] = [];
    if (Array.isArray(tag_object_ids)) {
      parsedTags = tag_object_ids;
    } else if (typeof tag_object_ids === "string") {
      try {
        const parsed = JSON.parse(tag_object_ids);
        parsedTags = Array.isArray(parsed) ? parsed : [parsed];
      } catch {
        parsedTags = tag_object_ids ? [tag_object_ids] : [];
      }
    }

    console.log(tag_object_ids);

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
      attachments: parsedAttachments,
      tag_object_ids: parsedTags,
      project_object_id: project_object_id || null,
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

    // Populate the task with all relations
    const populatedTask = await TaskModel.findById(newTask._id)
      .populate("assigned_users_info", "full_name email profile_picture")
      .populate("phase_info")
      .populate("tags_info")
      .lean();

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

    logActivity({
      company_object_id: company_object_id?.toString(),
      actor_object_id: user_object_id?.toString(),
      actor_name: req.user?.full_name || "Unknown",
      activity_type: "TASK_CREATED",
      message: `created a new task "${title}"`,
      metadata: { task_id: populatedTask?._id },
    });

    res.status(201).json({
      message: "Task created successfully",
      data: {
        ...populatedTask,
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
  console.log("<=======> hit");
  try {
    const { company_object_id, _id: user_object_id } = req.user;
    const {
      page,
      limit,
      assigned_user_id,
      phase_object_id,
      due_date_from,
      due_date_to,
      my_tasks,
      sort_by,
      sort_order,
      project_object_id,
    } = req.query;

    const currentPage = Number(page) || 1;
    const pageLimit = Number(limit) || 30;

    const startIndex = (currentPage - 1) * pageLimit;
    const endIndex = startIndex + pageLimit;

    // Build dynamic filter
    const filter: any = { company_object_id: company_object_id! };

    // Filter by "My Tasks" - tasks assigned to the logged-in user (takes priority)
    if (my_tasks === "true") {
      filter.assigned_user_list = user_object_id;
    }
    // Filter by assigned user (only if my_tasks is not set)
    else if (assigned_user_id) {
      filter.assigned_user_list = assigned_user_id;
    }

    // Filter by task phase (status) - only filter tasks that have phase_object_id
    if (phase_object_id) {
      filter.phase_object_id = phase_object_id;
    }

    // Filter by project
    if (project_object_id) {
      filter.project_object_id = project_object_id;
    }

    // Filter by due date range
    if (due_date_from || due_date_to) {
      filter.due_date = {};
      if (due_date_from) {
        filter.due_date.$gte = new Date(due_date_from as string);
      }
      if (due_date_to) {
        filter.due_date.$lte = new Date(due_date_to as string);
      }
    }

    // Build sort options
    const sortOptions: any = {};
    if (sort_by) {
      const sortField = sort_by as string;
      // Handle if user passes 'asc' or 'desc' directly in sort_by
      if (sortField === "asc" || sortField === "desc") {
        sortOptions.createdAt = sortField === "desc" ? -1 : 1;
      } else {
        const sortDirection = sort_order === "desc" ? -1 : 1;
        sortOptions[sortField] = sortDirection;
      }
    } else {
      sortOptions.createdAt = -1; // Default: newest first
    }

    console.log("Get task all filters : ", filter);

    // Get total count for pagination
    const totalTasks = await TaskModel.countDocuments(filter);

    const tasks = await getTaskService(
      filter,
      startIndex,
      endIndex,
      sortOptions,
    );

    res.status(200).json({
      message: "Tasks fetched successfully",
      data: tasks,
      pagination: {
        currentPage: currentPage,
        totalCount: totalTasks,
        totalPages: Math.ceil(totalTasks / pageLimit),
      },
      filters_applied: {
        assigned_user_id: assigned_user_id || null,
        phase_object_id: phase_object_id || null,
        due_date_range:
          due_date_from || due_date_to
            ? { from: due_date_from, to: due_date_to }
            : null,
        my_tasks: my_tasks === "true",
        project_object_id: project_object_id || null,
      },
    });
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

    logActivity({
      company_object_id: req.user?.company_object_id?.toString(),
      actor_object_id: req.user?._id?.toString(),
      actor_name: req.user?.full_name || "Unknown",
      activity_type: "TASK_COMPLETED",
      message: `updated task status to "${phase_object_id}"`,
      metadata: { task_id: taskId },
    });

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

    logActivity({
      company_object_id: req.user?.company_object_id?.toString(),
      actor_object_id: req.user?._id?.toString(),
      actor_name: req.user?.full_name || "Unknown",
      activity_type: "TASK_ASSIGNED",
      message: `assigned a task to ${user.full_name}`,
      metadata: { task_id: taskId, assigned_to: userId },
    });

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
    logActivity({
      company_object_id: req.user?.company_object_id?.toString(),
      actor_object_id: req.user?._id?.toString(),
      actor_name: req.user?.full_name || "Unknown",
      activity_type: "TASK_DELETED",
      message: `deleted a task`,
      metadata: { task_id: taskId },
    });

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
    const {
      attachments,
      attachment_descriptions,
      tag_object_id_list,
      ...restOfBody
    } = req.body;

    let updateData = { ...restOfBody };

    console.log(tag_object_id_list);

    // Parse attachments if they exist in the update request
    if (attachments !== undefined || req.body.existing_attachments !== undefined) {
      let parsedExistingAttachments: TaskAttachment[] = [];
      if (req.body.existing_attachments) {
        try {
          const parsed = typeof req.body.existing_attachments === "string"
            ? JSON.parse(req.body.existing_attachments)
            : req.body.existing_attachments;
          if (Array.isArray(parsed)) {
            parsedExistingAttachments = parsed.map(att => ({
              url: att.url || "",
              description: att.description || ""
            }));
          }
        } catch (err) {
          console.error("Failed to parse existing_attachments:", err);
        }
      }

      let parsedNewAttachments: TaskAttachment[] = [];
      let descriptions: string[] = [];

      if (Array.isArray(attachment_descriptions)) {
        descriptions = attachment_descriptions;
      } else if (typeof attachment_descriptions === "string") {
        try {
          const parsed = JSON.parse(attachment_descriptions);
          descriptions = Array.isArray(parsed) ? parsed : [parsed];
        } catch {
          descriptions = [attachment_descriptions];
        }
      }

      if (Array.isArray(attachments)) {
        parsedNewAttachments = attachments.map((att, index) => {
          if (typeof att === "object" && att.url) {
            return { url: att.url, description: att.description || "" };
          }
          if (typeof att === "string") {
            return { url: att, description: descriptions[index] || "" };
          }
          return { url: String(att), description: "" };
        });
      } else if (typeof attachments === "string") {
        try {
          const parsed = JSON.parse(attachments);
          if (Array.isArray(parsed)) {
            parsedNewAttachments = parsed.map((att, index) => {
              if (typeof att === "object" && att.url) {
                return { url: att.url, description: att.description || "" };
              }
              return { url: String(att), description: descriptions[index] || "" };
            });
          } else if (typeof parsed === "object" && parsed.url) {
            parsedNewAttachments = [
              { url: parsed.url, description: parsed.description || "" },
            ];
          } else {
            parsedNewAttachments = [
              { url: attachments, description: descriptions[0] || "" },
            ];
          }
        } catch {
          parsedNewAttachments = [
            { url: attachments, description: descriptions[0] || "" },
          ];
        }
      }

      updateData.attachments = [...parsedExistingAttachments, ...parsedNewAttachments];
    }

    // Parse tag_object_ids if provided
    if (tag_object_id_list !== undefined) {
      let parsedTags: string[] = [];
      if (Array.isArray(tag_object_id_list)) {
        parsedTags = tag_object_id_list;
      } else if (typeof tag_object_id_list === "string") {
        try {
          const parsed = JSON.parse(tag_object_id_list);
          parsedTags = Array.isArray(parsed) ? parsed : [parsed];
        } catch {
          parsedTags = tag_object_id_list ? [tag_object_id_list] : [];
        }
      }
      updateData.tag_object_ids = parsedTags;
    }

    const updatedTask = await TaskModel.findByIdAndUpdate(taskId, updateData, {
      new: true,
    })
      .populate("assigned_users_info", "full_name email profile_picture")
      .populate("phase_info")
      .populate("tags_info");

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
