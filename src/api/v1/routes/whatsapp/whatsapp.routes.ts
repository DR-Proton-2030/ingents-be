import { Router } from "express";
import { connectWhatsapp, disconnectWhatsapp } from "../../controller/whatsapp/whatsapp.controller";
import { userAuth } from "../../middlewares/auth/userAuth";

const router = Router();

router.post("/connect", userAuth, connectWhatsapp);
router.post("/disconnect", userAuth, disconnectWhatsapp);

export default router;
