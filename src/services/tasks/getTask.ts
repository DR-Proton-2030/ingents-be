
import TaskModel from "../../models/tasks/tasks.model";
import AssignedTaskModel from "../../models/assignedTask/assignedTask.model";
import { Task } from "../../types/interface/task.interface";

export const getTaskService = async (filter: Partial<Task>, startIndex: number, endIndex: number) => {
    // Fetch all tasks matching the filter (pagination will be applied after nesting)
    const allTasks = await TaskModel.find(filter);

    // Build a map of tasks by their _id for quick lookup
    const taskMap: Record<string, any> = {};
    for (const task of allTasks) {
        taskMap[String(task._id)] = { ...task.toObject(), subtask: [], assignees: [] };
    }

    // Fetch assignees for all tasks in parallel
    const assigneePromises = allTasks.map(async (task) => {
        const assigned = await AssignedTaskModel.find({ task_object_id: task._id });
        // Collect assigned_to_user_object_id for each assignment
        return {
            taskId: String(task._id),
            assignees: assigned.map(a => a.assigned_to_user_object_id)
        };
    });
    const assigneeResults = await Promise.all(assigneePromises);
    for (const { taskId, assignees } of assigneeResults) {
        if (taskMap[taskId]) {
            taskMap[taskId].assignees = assignees;
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
}