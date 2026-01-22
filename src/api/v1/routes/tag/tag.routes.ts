import { Router } from "express";

import {
  createTag,
  getTags,
  updateTag,
  deleteTag,
} from "../../controller/tag/tag.controller";
import { userAuth } from "../../middlewares/auth/userAuth";

const tagRouter = Router();

// Create a new tag
tagRouter.post("/create-tag", userAuth, createTag);

// Get all tags for company
tagRouter.get("/get-all-tag", userAuth, getTags);

// Update a tag
tagRouter.put("/update-tag/:id", userAuth, updateTag);

// Delete a tag
tagRouter.delete("/delete/:id", userAuth, deleteTag);

export default tagRouter;
