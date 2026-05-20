import { Router } from "express";
import { userAuth } from "../../middlewares/auth/userAuth";
import {
  getMemories,
  addMemory,
  updateMemory,
  deleteMemory,
} from "../../controller/memory/memory.controller";

const memoryRouter = Router();

// All memory routes require authentication
memoryRouter.get("/", userAuth, getMemories);
memoryRouter.post("/", userAuth, addMemory);
memoryRouter.put("/:id", userAuth, updateMemory);
memoryRouter.delete("/:id", userAuth, deleteMemory);

export default memoryRouter;
