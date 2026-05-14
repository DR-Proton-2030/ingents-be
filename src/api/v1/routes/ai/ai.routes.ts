import { Router } from "express";
import { generateContent } from "../../controller/ai/ai.controller";

const router = Router();

router.post("/generate", generateContent);

export default router;
