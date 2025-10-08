import { Router } from "express";
import { userAuth } from "../../middlewares/auth/userAuth";
import {
  createEmailTemplate,
  getAllEmailTemplates,
  getEmailTemplateById,
  updateEmailTemplate,
  deleteEmailTemplate,
} from "../../controller/emailTemplate/emailTemplate.controller";

const router = Router();

router.post("/", userAuth, createEmailTemplate);
router.get("/", userAuth, getAllEmailTemplates);
router.get("/:id", userAuth, getEmailTemplateById);
router.patch("/:id", userAuth, updateEmailTemplate);
router.delete("/:id", userAuth, deleteEmailTemplate);

export default router;
