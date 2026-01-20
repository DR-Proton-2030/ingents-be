"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getTaskPhases = exports.createTaskPhase = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const taskPhase_model_1 = __importDefault(require("../../../../models/taskPhase/taskPhase.model"));
const tasks_model_1 = __importDefault(require("../../../../models/tasks/tasks.model"));
/**
 * Create a new task phase
 * @route POST /api/v1/task-phase
 */
const createTaskPhase = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const session = yield mongoose_1.default.startSession();
    session.startTransaction();
    try {
        const { name, index, color, task_object_id } = req.body;
        console.log("Task Object id : ", task_object_id);
        const { company_object_id } = req.user;
        if (!name) {
            return res.status(400).json({ message: "Phase name is required" });
        }
        // Check if phase with same name exists for this company
        const existingPhase = yield taskPhase_model_1.default.findOne({
            company_object_id,
            name: { $regex: new RegExp(`^${name}$`, "i") },
        });
        if (existingPhase) {
            yield session.abortTransaction();
            return res.status(400).json({
                message: "A phase with this name already exists",
            });
        }
        // Determine index: use provided index, else count + 1
        let newIndex;
        if (typeof index === "number") {
            newIndex = index;
        }
        else {
            const count = yield taskPhase_model_1.default.countDocuments({
                company_object_id,
            }).session(session);
            newIndex = count + 1;
        }
        const newPhasePayload = {
            name,
            index: newIndex,
            company_object_id,
            is_default: false,
            color: color || "#3B82F6",
        };
        const newPhase = yield new taskPhase_model_1.default(newPhasePayload).save({ session });
        // If task_object_id is provided, update the task's phase_object_id
        if (task_object_id) {
            const task = yield tasks_model_1.default.findOne({
                _id: task_object_id,
                company_object_id,
            }).session(session);
            if (!task) {
                yield session.abortTransaction();
                return res.status(404).json({
                    message: "Task not found or does not belong to your company",
                });
            }
            task.phase_object_id = newPhase._id;
            yield task.save({ session });
        }
        yield session.commitTransaction();
        res.status(201).json({
            message: task_object_id
                ? "Task phase created and task updated successfully"
                : "Task phase created successfully",
            data: newPhase,
        });
    }
    catch (error) {
        if (session.inTransaction())
            yield session.abortTransaction();
        console.error("Error creating task phase:", error);
        res.status(500).json({
            message: "Failed to create task phase",
            error,
        });
    }
    finally {
        session.endSession();
    }
});
exports.createTaskPhase = createTaskPhase;
/**
 * Get all task phases for a company
 * @route GET /api/v1/task-phase
 */
const getTaskPhases = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { company_object_id } = req.user;
        const phases = yield taskPhase_model_1.default.find({ company_object_id }).sort({
            order: 1,
        });
        res.status(200).json({
            message: "Task phases retrieved successfully",
            data: phases,
        });
    }
    catch (error) {
        console.error("Error fetching task phases:", error);
        res.status(500).json({
            message: "Failed to fetch task phases",
            error,
        });
    }
});
exports.getTaskPhases = getTaskPhases;
// /**
//  * Get a single task phase by ID
//  * @route GET /api/v1/task-phase/:id
//  */
// export const getTaskPhaseById = async (req: Request, res: Response) => {
//   try {
//     const { id } = req.params;
//     const { company_object_id } = req.user;
//     const phase = await TaskPhase.findOne({
//       _id: id,
//       company_object_id,
//     });
//     if (!phase) {
//       return res.status(404).json({ message: "Task phase not found" });
//     }
//     res.status(200).json({
//       message: "Task phase retrieved successfully",
//       data: phase,
//     });
//   } catch (error) {
//     console.error("Error fetching task phase:", error);
//     res.status(500).json({
//       message: "Failed to fetch task phase",
//       error,
//     });
//   }
// };
// /**
//  * Update a task phase
//  * @route PUT /api/v1/task-phase/:id
//  */
// export const updateTaskPhase = async (req: Request, res: Response) => {
//   const session = await mongoose.startSession();
//   session.startTransaction();
//   try {
//     const { id } = req.params;
//     const { name, order, color } = req.body;
//     const { company_object_id } = req.user;
//     const phase = await TaskPhase.findOne({
//       _id: id,
//       company_object_id,
//     }).session(session);
//     if (!phase) {
//       await session.abortTransaction();
//       return res.status(404).json({ message: "Task phase not found" });
//     }
//     // Check if trying to rename to an existing phase name
//     if (name && name !== phase.name) {
//       const existingPhase = await TaskPhase.findOne({
//         company_object_id,
//         name: { $regex: new RegExp(`^${name}$`, "i") },
//         _id: { $ne: id },
//       }).session(session);
//       if (existingPhase) {
//         await session.abortTransaction();
//         return res.status(400).json({
//           message: "A phase with this name already exists",
//         });
//       }
//     }
//     // Update fields
//     if (name) phase.name = name;
//     if (order !== undefined) phase.order = order;
//     if (color) phase.color = color;
//     await phase.save({ session });
//     await session.commitTransaction();
//     res.status(200).json({
//       message: "Task phase updated successfully",
//       data: phase,
//     });
//   } catch (error) {
//     if (session.inTransaction()) await session.abortTransaction();
//     console.error("Error updating task phase:", error);
//     res.status(500).json({
//       message: "Failed to update task phase",
//       error,
//     });
//   } finally {
//     session.endSession();
//   }
// };
// /**
//  * Delete a task phase
//  * @route DELETE /api/v1/task-phase/:id
//  */
// export const deleteTaskPhase = async (req: Request, res: Response) => {
//   const session = await mongoose.startSession();
//   session.startTransaction();
//   try {
//     const { id } = req.params;
//     const { company_object_id } = req.user;
//     const phase = await TaskPhase.findOne({
//       _id: id,
//       company_object_id,
//     }).session(session);
//     if (!phase) {
//       await session.abortTransaction();
//       return res.status(404).json({ message: "Task phase not found" });
//     }
//     // Prevent deletion of default phases
//     if (phase.is_default) {
//       await session.abortTransaction();
//       return res.status(400).json({
//         message: "Cannot delete default task phases",
//       });
//     }
//     // Check if any tasks are using this phase
//     const TaskModel = mongoose.model("Task");
//     const tasksUsingPhase = await TaskModel.countDocuments({
//       phase_object_id: id,
//       company_object_id,
//     }).session(session);
//     if (tasksUsingPhase > 0) {
//       await session.abortTransaction();
//       return res.status(400).json({
//         message: `Cannot delete phase. ${tasksUsingPhase} task(s) are using this phase. Please reassign them first.`,
//       });
//     }
//     await TaskPhase.deleteOne({ _id: id }).session(session);
//     await session.commitTransaction();
//     res.status(200).json({
//       message: "Task phase deleted successfully",
//     });
//   } catch (error) {
//     if (session.inTransaction()) await session.abortTransaction();
//     console.error("Error deleting task phase:", error);
//     res.status(500).json({
//       message: "Failed to delete task phase",
//       error,
//     });
//   } finally {
//     session.endSession();
//   }
// };
// /**
//  * Reorder task phases
//  * @route PUT /api/v1/task-phase/reorder
//  */
// export const reorderTaskPhases = async (req: Request, res: Response) => {
//   const session = await mongoose.startSession();
//   session.startTransaction();
//   try {
//     const { phases } = req.body; // Array of { id, order }
//     const { company_object_id } = req.user;
//     if (!Array.isArray(phases) || phases.length === 0) {
//       return res.status(400).json({
//         message: "Phases array is required with id and order fields",
//       });
//     }
//     // Update each phase's order
//     const updatePromises = phases.map(({ id, order }) =>
//       TaskPhase.updateOne(
//         { _id: id, company_object_id },
//         { $set: { order } },
//       ).session(session),
//     );
//     await Promise.all(updatePromises);
//     await session.commitTransaction();
//     // Fetch updated phases
//     const updatedPhases = await TaskPhase.find({ company_object_id }).sort({
//       order: 1,
//     });
//     res.status(200).json({
//       message: "Task phases reordered successfully",
//       data: updatedPhases,
//     });
//   } catch (error) {
//     if (session.inTransaction()) await session.abortTransaction();
//     console.error("Error reordering task phases:", error);
//     res.status(500).json({
//       message: "Failed to reorder task phases",
//       error,
//     });
//   } finally {
//     session.endSession();
//   }
// };
