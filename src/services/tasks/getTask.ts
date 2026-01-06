import TaskModel from "../../models/tasks/tasks.model";
import AssignedTaskModel from "../../models/assignedTask/assignedTask.model";
import { Task } from "../../types/interface/task.interface";
import { IAssignedTask } from "../../types/interface/assignedTask.interface";

export const getTaskService = async (
  filter: Partial<Task>,
  startIndex: number,
  endIndex: number
) => {
  // Fetch all tasks matching the filter
  const allTasks = await TaskModel.find(filter);

  // Build a map of tasks by _id for quick lookup
  const taskMap: Record<string, any> = {};
  for (const task of allTasks) {
    taskMap[String(task._id)] = { ...task.toObject(), subtask: [], assignees: [] };
  }

  // Fetch all assigned tasks for these task IDs in one query and populate virtual
  interface AssignedTaskWithUser extends IAssignedTask {
    user_details?: { _id: string; full_name: string };
  }

  const assignedTasks = await AssignedTaskModel.find({
    task_object_id: { $in: allTasks.map(t => t._id) }
  })
    .populate("user_details", "full_name")
    .lean();

  // Map assignees to the expected object shape
  for (const assigned of assignedTasks as AssignedTaskWithUser[]) {
    const taskId = String(assigned.task_object_id);
    if (taskMap[taskId] && assigned.user_details) {
      const user = assigned.user_details;
      taskMap[taskId].assignees.push({
        _id: user._id,
        full_name: user.full_name,
        initials: user.full_name
          .split(" ")
          .map((n) => n[0])
          .join("")
          .toUpperCase(),
        color: "", // AvatarGroup will generate a random color if empty
      });
    }
  }

  // Build the tree: assign each task to its parent's subtask array if it has a parent
  const rootTasks: any[] = [];
  for (const task of allTasks) {
    const taskId = String(task._id);
    const parentId = task.parent_task_object_id ? String(task.parent_task_object_id) : null;
    if (parentId && taskMap[parentId]) {
      taskMap[parentId].subtask.push(taskMap[taskId]);
    } else {
      rootTasks.push(taskMap[taskId]);
    }
  }

  // Apply pagination to the root tasks only
  const paginatedRootTasks = rootTasks.slice(startIndex, endIndex);
  return paginatedRootTasks;
};
