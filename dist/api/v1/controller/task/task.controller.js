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
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.editTask = exports.unassignTaskFromUser = exports.deleteTask = exports.assignTaskToUser = exports.updateTaskStatus = exports.getTasks = exports.createTask = void 0;
const users_model_1 = __importDefault(require("../../../../models/users/users.model"));
const tasks_model_1 = __importDefault(require("../../../../models/tasks/tasks.model"));
const getTask_1 = require("../../../../services/tasks/getTask");
const assignedTask_model_1 = __importDefault(require("../../../../models/assignedTask/assignedTask.model"));
const mongoose_1 = __importDefault(require("mongoose"));
const callMailServer_1 = require("../../../../services/callMailServer/callMailServer");
const taskPhase_model_1 = __importDefault(require("../../../../models/taskPhase/taskPhase.model"));
const createTask = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const session = yield mongoose_1.default.startSession();
    session.startTransaction();
    try {
        const { title, completed = false, description = "", parent_task_object_id = null, due_date = null, priority = "Normal", phase_object_id, assigned_user_list, attachments = [], // Can be URLs from fileUploadHelper or array of {url, description}
        attachment_descriptions = [], // Optional descriptions for each attachment
        tag_object_ids = [], // Array of tag IDs
        project_object_id = null, } = req.body;
        console.log("Phase Object Id : ", phase_object_id);
        const { _id: user_object_id, company_object_id } = req.user;
        if (!title) {
            return res.status(400).json({ message: "Task title is required" });
        }
        // Get phase_object_id: use provided one or default to "Not Started" phase
        let taskPhaseId = phase_object_id;
        if (!taskPhaseId) {
            const defaultPhase = yield taskPhase_model_1.default.findOne({
                company_object_id,
                name: "Not Started",
            }).session(session);
            if (!defaultPhase) {
                yield session.abortTransaction();
                return res.status(400).json({
                    message: "No default task phase found. Please create task phases first.",
                });
            }
            taskPhaseId = defaultPhase._id;
        }
        let parsedAssignedUsers = [];
        if (Array.isArray(assigned_user_list)) {
            parsedAssignedUsers = assigned_user_list;
        }
        else if (typeof assigned_user_list === "string") {
            try {
                const parsed = JSON.parse(assigned_user_list);
                parsedAssignedUsers = Array.isArray(parsed) ? parsed : [parsed];
            }
            catch (_a) {
                parsedAssignedUsers = [assigned_user_list];
            }
        }
        // Parse attachments (handle multiple formats)
        // Format 1: Array of URLs from fileUploadHelper (strings)
        // Format 2: Array of {url, description} objects
        // Format 3: JSON string of attachment objects
        let parsedAttachments = [];
        // Parse attachment_descriptions if it's a JSON string
        let descriptions = [];
        if (Array.isArray(attachment_descriptions)) {
            descriptions = attachment_descriptions;
        }
        else if (typeof attachment_descriptions === "string") {
            try {
                const parsed = JSON.parse(attachment_descriptions);
                descriptions = Array.isArray(parsed) ? parsed : [parsed];
            }
            catch (_b) {
                descriptions = [attachment_descriptions];
            }
        }
        if (Array.isArray(attachments)) {
            parsedAttachments = attachments.map((att, index) => {
                // If it's already an object with url property
                if (typeof att === "object" && att.url) {
                    return { url: att.url, description: att.description || "" };
                }
                // If it's a string URL (from fileUploadHelper)
                if (typeof att === "string") {
                    return { url: att, description: descriptions[index] || "" };
                }
                return { url: String(att), description: "" };
            });
        }
        else if (typeof attachments === "string") {
            try {
                const parsed = JSON.parse(attachments);
                if (Array.isArray(parsed)) {
                    parsedAttachments = parsed.map((att, index) => {
                        if (typeof att === "object" && att.url) {
                            return { url: att.url, description: att.description || "" };
                        }
                        return { url: String(att), description: descriptions[index] || "" };
                    });
                }
                else if (typeof parsed === "object" && parsed.url) {
                    parsedAttachments = [
                        { url: parsed.url, description: parsed.description || "" },
                    ];
                }
                else {
                    parsedAttachments = [
                        { url: attachments, description: descriptions[0] || "" },
                    ];
                }
            }
            catch (_c) {
                parsedAttachments = [
                    { url: attachments, description: descriptions[0] || "" },
                ];
            }
        }
        // Parse tag_object_ids
        let parsedTags = [];
        if (Array.isArray(tag_object_ids)) {
            parsedTags = tag_object_ids;
        }
        else if (typeof tag_object_ids === "string") {
            try {
                const parsed = JSON.parse(tag_object_ids);
                parsedTags = Array.isArray(parsed) ? parsed : [parsed];
            }
            catch (_d) {
                parsedTags = tag_object_ids ? [tag_object_ids] : [];
            }
        }
        console.log(tag_object_ids);
        const newTaskPayload = {
            title,
            completed,
            description,
            parent_task_object_id,
            due_date,
            priority,
            progress: 0,
            phase_object_id: taskPhaseId,
            created_by_user_object_id: user_object_id,
            company_object_id: company_object_id,
            assigned_user_list: parsedAssignedUsers,
            attachments: parsedAttachments,
            tag_object_ids: parsedTags,
            project_object_id: project_object_id || null,
        };
        const newTask = yield new tasks_model_1.default(newTaskPayload).save({ session });
        // Create AssignedTask entries
        if (parsedAssignedUsers.length > 0) {
            const assignedTasksPayload = parsedAssignedUsers.map((uid) => ({
                task_object_id: newTask._id,
                assigned_to_user_object_id: uid,
                assigned_by_user_object_id: user_object_id,
                company_object_id: company_object_id,
                assigned_at: new Date(),
            }));
            yield assignedTask_model_1.default.insertMany(assignedTasksPayload, { session });
        }
        yield session.commitTransaction();
        // Populate the task with all relations
        const populatedTask = yield tasks_model_1.default.findById(newTask._id)
            .populate("assigned_users_info", "full_name email profile_picture")
            .populate("phase_info")
            .populate("tags_info")
            .lean();
        // 🔹 Fetch assigned users (email + name)
        const assignedTasks = yield assignedTask_model_1.default.find({
            task_object_id: newTask._id,
        })
            .populate("user_details", "full_name email")
            .lean();
        const assigningUser = yield users_model_1.default.findById(user_object_id)
            .select("full_name")
            .lean();
        const assignedByName = typeof (assigningUser === null || assigningUser === void 0 ? void 0 : assigningUser.full_name) === "string"
            ? assigningUser.full_name
            : "Admin";
        // Send Task Assignment Emails
        if (assignedTasks.length > 0) {
            yield Promise.all(assignedTasks.map((assigned) => __awaiter(void 0, void 0, void 0, function* () {
                const user = assigned.user_details;
                if (!(user === null || user === void 0 ? void 0 : user.email))
                    return;
                try {
                    yield (0, callMailServer_1.callMailServer)("task-assignment", {
                        email: user.email,
                        user_name: user.full_name,
                        taskTitle: newTask.title,
                        assignedBy: assignedByName || "Admin",
                    });
                }
                catch (mailError) {
                    console.error(`❌ Failed to send task mail to ${user.email}`, mailError);
                }
            })));
        }
        res.status(201).json({
            message: "Task created successfully",
            data: Object.assign(Object.assign({}, populatedTask), { assignedTasks }),
        });
    }
    catch (error) {
        if (session.inTransaction())
            yield session.abortTransaction();
        console.error("❌ Create Task Error:", error);
        res.status(500).json({
            message: "Internal server error",
        });
    }
    finally {
        session.endSession();
    }
});
exports.createTask = createTask;
const getTasks = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    console.log("<=======> hit");
    try {
        const { company_object_id, _id: user_object_id } = req.user;
        const { page, limit, assigned_user_id, phase_object_id, due_date_from, due_date_to, my_tasks, sort_by, sort_order, project_object_id, } = req.query;
        const currentPage = Number(page) || 1;
        const pageLimit = Number(limit) || 30;
        const startIndex = (currentPage - 1) * pageLimit;
        const endIndex = startIndex + pageLimit;
        // Build dynamic filter
        const filter = { company_object_id: company_object_id };
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
                filter.due_date.$gte = new Date(due_date_from);
            }
            if (due_date_to) {
                filter.due_date.$lte = new Date(due_date_to);
            }
        }
        // Build sort options
        const sortOptions = {};
        if (sort_by) {
            const sortField = sort_by;
            // Handle if user passes 'asc' or 'desc' directly in sort_by
            if (sortField === "asc" || sortField === "desc") {
                sortOptions.createdAt = sortField === "desc" ? -1 : 1;
            }
            else {
                const sortDirection = sort_order === "desc" ? -1 : 1;
                sortOptions[sortField] = sortDirection;
            }
        }
        else {
            sortOptions.createdAt = -1; // Default: newest first
        }
        console.log("Get task all filters : ", filter);
        // Get total count for pagination
        const totalTasks = yield tasks_model_1.default.countDocuments(filter);
        const tasks = yield (0, getTask_1.getTaskService)(filter, startIndex, endIndex, sortOptions);
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
                due_date_range: due_date_from || due_date_to
                    ? { from: due_date_from, to: due_date_to }
                    : null,
                my_tasks: my_tasks === "true",
                project_object_id: project_object_id || null,
            },
        });
    }
    catch (error) {
        res.status(500).json({ message: "Internal server error", error });
    }
});
exports.getTasks = getTasks;
const updateTaskStatus = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
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
        const phase = yield taskPhase_model_1.default.findOne({
            _id: phase_object_id,
            company_object_id,
        });
        if (!phase) {
            return res.status(400).json({
                message: "Invalid task phase or phase does not belong to your company",
            });
        }
        const task = yield tasks_model_1.default.findByIdAndUpdate(taskId, { phase_object_id }, { new: true }).populate("phase_info");
        if (!task) {
            return res.status(404).json({ message: "Task not found" });
        }
        return res.status(200).json({
            message: "Task phase updated",
            task,
        });
    }
    catch (error) {
        console.error("Update task phase error:", error);
        return res.status(500).json({ message: "Server error" });
    }
});
exports.updateTaskStatus = updateTaskStatus;
const assignTaskToUser = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { taskId, userId } = req.params;
        const { _id: user_object_id } = req.user;
        // Check if user exists
        const user = yield users_model_1.default.findById(userId);
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }
        //  Assign user to task
        const task = yield tasks_model_1.default.findByIdAndUpdate(taskId, { $addToSet: { assigned_user_list: userId } }, // prevent duplicates
        { new: true }).populate("assigned_users_info", "full_name email");
        if (!task) {
            return res.status(404).json({ message: "Task not found" });
        }
        const assigningUser = yield users_model_1.default.findById(user_object_id)
            .select("full_name")
            .lean();
        const assignedByName = typeof (assigningUser === null || assigningUser === void 0 ? void 0 : assigningUser.full_name) === "string"
            ? assigningUser.full_name
            : "Admin";
        try {
            yield (0, callMailServer_1.callMailServer)("task-assignment", {
                email: user.email,
                user_name: user.full_name,
                taskTitle: task.title,
                assignedBy: assignedByName || "Admin",
            });
            console.log(`✅ Email sent to ${user.email}`);
        }
        catch (mailError) {
            console.error("Error sending email:", mailError);
        }
        return res.status(200).json({
            message: "User assigned successfully",
            taskId,
            assignees: task.assigned_users_info,
        });
    }
    catch (error) {
        console.error("Assign user error:", error);
        return res.status(500).json({ message: "Server error" });
    }
});
exports.assignTaskToUser = assignTaskToUser;
const deleteTask = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { taskId } = req.params;
        const task = yield tasks_model_1.default.findByIdAndDelete(taskId);
        if (!task) {
            return res.status(404).json({ message: "Task not found" });
        }
        return res.status(200).json({
            message: "Task deleted successfully",
        });
    }
    catch (error) {
        console.error("Delete task error:", error);
        return res.status(500).json({ message: "Server error" });
    }
});
exports.deleteTask = deleteTask;
const unassignTaskFromUser = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const session = yield mongoose_1.default.startSession();
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
        const user = yield users_model_1.default.findById(userId);
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }
        // Ensure task exists & belongs to company
        const task = yield tasks_model_1.default.findOne({
            _id: taskId,
            company_object_id,
        }).session(session);
        if (!task) {
            return res.status(404).json({
                message: "Task not found",
            });
        }
        // Remove user from task.assigned_user_list
        yield tasks_model_1.default.updateOne({ _id: taskId }, { $pull: { assigned_user_list: userId } }, { session });
        // 3️⃣ Delete assigned task record
        yield assignedTask_model_1.default.deleteOne({
            task_object_id: taskId,
            assigned_to_user_object_id: userId,
            company_object_id,
        }, { session });
        yield session.commitTransaction();
        const assigningUser = yield users_model_1.default.findById(user_object_id)
            .select("full_name")
            .lean();
        const assignedByName = typeof (assigningUser === null || assigningUser === void 0 ? void 0 : assigningUser.full_name) === "string"
            ? assigningUser.full_name
            : "Admin";
        try {
            yield (0, callMailServer_1.callMailServer)("task-unassignment", {
                email: user.email,
                user_name: user.full_name,
                taskTitle: task.title,
                assignedBy: assignedByName || "Admin",
            });
            console.log(`✅ Email sent to ${user.email}`);
        }
        catch (mailError) {
            console.error("Error sending email:", mailError);
        }
        return res.status(200).json({
            message: "User unassigned from task successfully",
        });
    }
    catch (error) {
        if (session.inTransaction()) {
            yield session.abortTransaction();
        }
        console.error("Unassign Task Error:", error);
        return res.status(500).json({
            message: "Internal server error",
        });
    }
    finally {
        session.endSession();
    }
});
exports.unassignTaskFromUser = unassignTaskFromUser;
const editTask = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { taskId } = req.params;
        const _e = req.body, { attachments, attachment_descriptions, tag_object_id_list } = _e, restOfBody = __rest(_e, ["attachments", "attachment_descriptions", "tag_object_id_list"]);
        let updateData = Object.assign({}, restOfBody);
        console.log(tag_object_id_list);
        // Parse attachments if they exist in the update request
        if (attachments !== undefined) {
            let parsedAttachments = [];
            let descriptions = [];
            if (Array.isArray(attachment_descriptions)) {
                descriptions = attachment_descriptions;
            }
            else if (typeof attachment_descriptions === "string") {
                try {
                    const parsed = JSON.parse(attachment_descriptions);
                    descriptions = Array.isArray(parsed) ? parsed : [parsed];
                }
                catch (_f) {
                    descriptions = [attachment_descriptions];
                }
            }
            if (Array.isArray(attachments)) {
                parsedAttachments = attachments.map((att, index) => {
                    if (typeof att === "object" && att.url) {
                        return { url: att.url, description: att.description || "" };
                    }
                    if (typeof att === "string") {
                        return { url: att, description: descriptions[index] || "" };
                    }
                    return { url: String(att), description: "" };
                });
            }
            else if (typeof attachments === "string") {
                try {
                    const parsed = JSON.parse(attachments);
                    if (Array.isArray(parsed)) {
                        parsedAttachments = parsed.map((att, index) => {
                            if (typeof att === "object" && att.url) {
                                return { url: att.url, description: att.description || "" };
                            }
                            return {
                                url: String(att),
                                description: descriptions[index] || "",
                            };
                        });
                    }
                    else if (typeof parsed === "object" && parsed.url) {
                        parsedAttachments = [
                            { url: parsed.url, description: parsed.description || "" },
                        ];
                    }
                    else {
                        parsedAttachments = [
                            { url: attachments, description: descriptions[0] || "" },
                        ];
                    }
                }
                catch (_g) {
                    parsedAttachments = [
                        { url: attachments, description: descriptions[0] || "" },
                    ];
                }
            }
            updateData.attachments = parsedAttachments;
        }
        // Parse tag_object_ids if provided
        if (tag_object_id_list !== undefined) {
            let parsedTags = [];
            if (Array.isArray(tag_object_id_list)) {
                parsedTags = tag_object_id_list;
            }
            else if (typeof tag_object_id_list === "string") {
                try {
                    const parsed = JSON.parse(tag_object_id_list);
                    parsedTags = Array.isArray(parsed) ? parsed : [parsed];
                }
                catch (_h) {
                    parsedTags = tag_object_id_list ? [tag_object_id_list] : [];
                }
            }
            updateData.tag_object_ids = parsedTags;
        }
        const updatedTask = yield tasks_model_1.default.findByIdAndUpdate(taskId, updateData, {
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
    }
    catch (error) {
        console.error("Edit Task Error:", error);
        res.status(500).json({ message: "Internal server error" });
    }
});
exports.editTask = editTask;
