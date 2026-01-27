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
exports.deleteTag = exports.updateTag = exports.getTags = exports.createTag = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const tag_model_1 = __importDefault(require("../../../../models/tag/tag.model"));
const tasks_model_1 = __importDefault(require("../../../../models/tasks/tasks.model"));
/**
 * Create a new tag
 * @route POST /api/v1/tags
 */
const createTag = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const session = yield mongoose_1.default.startSession();
    session.startTransaction();
    try {
        const { name, color } = req.body;
        const { company_object_id } = req.user;
        if (!name) {
            return res.status(400).json({ message: "Tag name is required" });
        }
        // Check if tag with same name exists for this company
        const existingTag = yield tag_model_1.default.findOne({
            company_object_id,
            name: { $regex: new RegExp(`^${name}$`, "i") },
        });
        if (existingTag) {
            yield session.abortTransaction();
            return res.status(400).json({
                message: "A tag with this name already exists",
            });
        }
        const newTagPayload = {
            name,
            color: color || "#3B82F6",
            company_object_id,
        };
        const newTag = yield new tag_model_1.default(newTagPayload).save({ session });
        yield session.commitTransaction();
        res.status(201).json({
            message: "Tag created successfully",
            data: newTag,
        });
    }
    catch (error) {
        if (session.inTransaction())
            yield session.abortTransaction();
        console.error("Error creating tag:", error);
        res.status(500).json({
            message: "Failed to create tag",
            error,
        });
    }
    finally {
        session.endSession();
    }
});
exports.createTag = createTag;
/**
 * Get all tags for a company
 * @route GET /api/v1/tags
 */
const getTags = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { company_object_id } = req.user;
        const tags = yield tag_model_1.default.find({ company_object_id }).sort({ createdAt: -1 });
        res.status(200).json({
            message: "Tags retrieved successfully",
            data: tags,
        });
    }
    catch (error) {
        console.error("Error fetching tags:", error);
        res.status(500).json({
            message: "Failed to fetch tags",
            error,
        });
    }
});
exports.getTags = getTags;
/**
 * Update a tag
 * @route PUT /api/v1/tags/:id
 */
const updateTag = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const session = yield mongoose_1.default.startSession();
    session.startTransaction();
    try {
        const { id } = req.params;
        const { name, color } = req.body;
        const { company_object_id } = req.user;
        const tag = yield tag_model_1.default.findOne({
            _id: id,
            company_object_id,
        }).session(session);
        if (!tag) {
            yield session.abortTransaction();
            return res.status(404).json({ message: "Tag not found" });
        }
        // Check if trying to rename to an existing tag name
        if (name && name !== tag.name) {
            const existingTag = yield tag_model_1.default.findOne({
                company_object_id,
                name: { $regex: new RegExp(`^${name}$`, "i") },
                _id: { $ne: id },
            }).session(session);
            if (existingTag) {
                yield session.abortTransaction();
                return res.status(400).json({
                    message: "A tag with this name already exists",
                });
            }
        }
        // Update fields
        if (name)
            tag.name = name;
        if (color)
            tag.color = color;
        yield tag.save({ session });
        yield session.commitTransaction();
        res.status(200).json({
            message: "Tag updated successfully",
            data: tag,
        });
    }
    catch (error) {
        if (session.inTransaction())
            yield session.abortTransaction();
        console.error("Error updating tag:", error);
        res.status(500).json({
            message: "Failed to update tag",
            error,
        });
    }
    finally {
        session.endSession();
    }
});
exports.updateTag = updateTag;
/**
 * Delete a tag
 * @route DELETE /api/v1/tags/:id
 */
const deleteTag = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const session = yield mongoose_1.default.startSession();
    session.startTransaction();
    try {
        const { id } = req.params;
        const { company_object_id } = req.user;
        const tag = yield tag_model_1.default.findOne({
            _id: id,
            company_object_id,
        }).session(session);
        if (!tag) {
            yield session.abortTransaction();
            return res.status(404).json({ message: "Tag not found" });
        }
        // Check if any tasks are using this tag
        const tasksUsingTag = yield tasks_model_1.default.countDocuments({
            tag_object_ids: id,
            company_object_id,
        }).session(session);
        if (tasksUsingTag > 0) {
            yield session.abortTransaction();
            return res.status(400).json({
                message: `Cannot delete tag. ${tasksUsingTag} task(s) are using this tag. Please remove it from tasks first.`,
            });
        }
        yield tag_model_1.default.deleteOne({ _id: id }).session(session);
        yield session.commitTransaction();
        res.status(200).json({
            message: "Tag deleted successfully",
        });
    }
    catch (error) {
        if (session.inTransaction())
            yield session.abortTransaction();
        console.error("Error deleting tag:", error);
        res.status(500).json({
            message: "Failed to delete tag",
            error,
        });
    }
    finally {
        session.endSession();
    }
});
exports.deleteTag = deleteTag;
