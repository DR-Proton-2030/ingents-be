import { Router } from "express";
import { createWaitList } from "../../controller/waitList/waitList.controller";

const waitListRouter = Router();

waitListRouter.patch("/create", createWaitList);

export default waitListRouter;