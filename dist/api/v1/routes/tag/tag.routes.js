"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const tag_controller_1 = require("../../controller/tag/tag.controller");
const userAuth_1 = require("../../middlewares/auth/userAuth");
const tagRouter = (0, express_1.Router)();
// Create a new tag
tagRouter.post("/create-tag", userAuth_1.userAuth, tag_controller_1.createTag);
// Get all tags for company
tagRouter.get("/get-all-tag", userAuth_1.userAuth, tag_controller_1.getTags);
// Update a tag
tagRouter.put("/update-tag/:id", userAuth_1.userAuth, tag_controller_1.updateTag);
// Delete a tag
tagRouter.delete("/delete/:id", userAuth_1.userAuth, tag_controller_1.deleteTag);
exports.default = tagRouter;
