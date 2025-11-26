import { Router } from "express";
import { userAuth } from "../../middlewares/auth/userAuth";
import {
  createSentEmail,
  getAllSentEmails,
  getSentEmailById,
  updateSentEmail,
  deleteSentEmail,
} from "../../controller/sentEmail/sentEmail.controller";
import { bulkEmailGenerationFromExcel } from "../../controller/bulkEmail/bulkEmail.controller";
import { upload } from "../../middlewares/helper/multer/multer.middleware";

const router = Router();

router.post("/excel",upload.single("file"), bulkEmailGenerationFromExcel);
router.post("/", userAuth, createSentEmail);
router.get("/", userAuth, getAllSentEmails);
router.get("/:id", userAuth, getSentEmailById);
router.patch("/:id", userAuth, updateSentEmail);
router.delete("/:id", userAuth, deleteSentEmail);

export default router;
