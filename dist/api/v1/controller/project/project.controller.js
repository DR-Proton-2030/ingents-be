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
exports.deleteProject = exports.updateProject = exports.getProjects = exports.createProject = void 0;
const project_model_1 = __importDefault(require("../../../../models/project/project.model"));
/**
 * Create a new project
 */
const createProject = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { name, detail } = req.body;
        const { _id: user_object_id, company_object_id } = req.user;
        if (!name || !detail) {
            return res.status(400).json({ message: "Name and detail are required" });
        }
        const newProject = new project_model_1.default({
            name,
            detail,
            company_object_id,
            created_by_user_object_id: user_object_id,
        });
        yield newProject.save();
        res.status(201).json({
            message: "Project created successfully",
            data: newProject,
        });
    }
    catch (error) {
        console.error("Create Project Error:", error);
        res.status(500).json({ message: "Internal server error" });
    }
});
exports.createProject = createProject;
/**
 * Get all projects for the company
 */
const getProjects = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { company_object_id } = req.user;
        const { page = 1, limit = 30 } = req.query;
        const currentPage = Number(page);
        const pageLimit = Number(limit);
        const skip = (currentPage - 1) * pageLimit;
        const query = { company_object_id };
        const [projects, totalCount] = yield Promise.all([
            project_model_1.default.find(query)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(pageLimit),
            project_model_1.default.countDocuments(query),
        ]);
        res.status(200).json({
            message: "Projects fetched successfully",
            data: projects,
            pagination: {
                currentPage,
                totalCount,
                totalPages: Math.ceil(totalCount / pageLimit),
            },
        });
    }
    catch (error) {
        console.error("Get Projects Error:", error);
        res.status(500).json({ message: "Internal server error" });
    }
});
exports.getProjects = getProjects;
/**
 * Update project details
 */
const updateProject = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { projectId } = req.params;
        const { company_object_id } = req.user;
        const updateData = req.body;
        const updatedProject = yield project_model_1.default.findOneAndUpdate({ _id: projectId, company_object_id }, updateData, { new: true });
        if (!updatedProject) {
            return res.status(404).json({ message: "Project not found" });
        }
        res.status(200).json({
            message: "Project updated successfully",
            data: updatedProject,
        });
    }
    catch (error) {
        console.error("Update Project Error:", error);
        res.status(500).json({ message: "Internal server error" });
    }
});
exports.updateProject = updateProject;
/**
 * Delete a project
 */
const deleteProject = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { projectId } = req.params;
        const { company_object_id } = req.user;
        const deletedProject = yield project_model_1.default.findOneAndDelete({
            _id: projectId,
            company_object_id,
        });
        if (!deletedProject) {
            return res.status(404).json({ message: "Project not found" });
        }
        res.status(200).json({ message: "Project deleted successfully" });
    }
    catch (error) {
        console.error("Delete Project Error:", error);
        res.status(500).json({ message: "Internal server error" });
    }
});
exports.deleteProject = deleteProject;
