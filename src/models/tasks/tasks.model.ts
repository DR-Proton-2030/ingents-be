import { model } from "mongoose";
import { Task } from "../../types/interface/task.interface";
import { taskSchema } from "./tasks.schema";

const TaskModel = model<Task>("tasks", taskSchema);

export default TaskModel;