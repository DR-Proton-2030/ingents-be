import { Router } from "express";
import { createWaitList } from "../../controller/waitList/waitList.controller";

const waitListRouter = Router();

waitListRouter.post("/create", createWaitList);

export default waitListRouter;