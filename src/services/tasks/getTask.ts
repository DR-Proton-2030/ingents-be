import TaskModel from "../../models/tasks/tasks.model";
import { Task } from "../../types/interface/task.interface";

export const getTaskService = async (
  filter: Partial<Task>,
  startIndex: number,
  endIndex: number,
  sortOptions: any = {},
) => {
  // 1️⃣ Fetch tasks WITH populated assigned users, phase info, and tags
  const allTasks = await TaskModel.find(filter)
    .populate("assigned_users_info", "full_name email profile_picture")
    .populate("phase_info")
    .populate("tags_info")
    .sort(sortOptions)
    .lean();

  // 2️⃣ Build map
  const taskMap: Record<string, any> = {};
  for (const task of allTasks) {
    taskMap[String(task._id)] = {
      ...task,
      subtask: [],
      assignees: task.assigned_users_info || [], // ✅ SINGLE SOURCE
    };
  }

  // 3️⃣ Build parent → subtask tree
  const rootTasks: any[] = [];
  for (const task of allTasks) {
    const taskId = String(task._id);
    const parentId = task.parent_task_object_id
      ? String(task.parent_task_object_id)
      : null;

    if (parentId && taskMap[parentId]) {
      taskMap[parentId].subtask.push(taskMap[taskId]);
    } else {
      rootTasks.push(taskMap[taskId]);
    }
  }

  // 4️⃣ Pagination on root tasks only
  return rootTasks.slice(startIndex, endIndex);
};
