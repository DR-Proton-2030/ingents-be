
import { model } from "mongoose";
import { assignedTaskSchema } from "./assignedTask.schema";
import { IAssignedTask } from "../../types/interface/assignedTask.interface";

const AssignedTaskModel = model<IAssignedTask>("assigned_tasks", assignedTaskSchema);

export default AssignedTaskModel;