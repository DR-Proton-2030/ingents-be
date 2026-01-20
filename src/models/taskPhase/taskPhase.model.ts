import { model } from "mongoose";
import { ITaskPhase } from "../../types/interface/taskPhase.interface";
import taskPhaseSchema from "./taskPhase.schema";

const TaskPhase = model<ITaskPhase>("TaskPhase", taskPhaseSchema);

export default TaskPhase;
