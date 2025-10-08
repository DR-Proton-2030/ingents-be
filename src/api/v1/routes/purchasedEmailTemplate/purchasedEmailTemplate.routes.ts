import { Router } from "express";
import { userAuth } from "../../middlewares/auth/userAuth";
import {
  createPurchasedEmailTemplate,
  getAllPurchasedEmailTemplates,
  getPurchasedEmailTemplateById,
  updatePurchasedEmailTemplate,
  deletePurchasedEmailTemplate,
} from "../../controller/purchasedEmailTemplate/purchasedEmailTemplate.controller";

const router = Router();

router.post("/", userAuth, createPurchasedEmailTemplate);
router.get("/", userAuth, getAllPurchasedEmailTemplates);
router.get("/:id", userAuth, getPurchasedEmailTemplateById);
router.patch("/:id", userAuth, updatePurchasedEmailTemplate);
router.delete("/:id", userAuth, deletePurchasedEmailTemplate);

export default router;
