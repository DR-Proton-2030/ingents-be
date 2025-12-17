import TaskModel from "../../models/tasks/tasks.model";
import { Task } from "../../types/interface/task.interface";

export const getTaskService = async (filter: Partial<Task>, startIndex: number, endIndex: number) => {
    // Fetch all tasks matching the filter (pagination will be applied after nesting)
    const allTasks = await TaskModel.find(filter);

    // Build a map of tasks by their _id for quick lookup
    const taskMap: Record<string, any> = {};
    for (const task of allTasks) {
        taskMap[String(task._id)] = { ...task.toObject(), subtask: [] };
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
}