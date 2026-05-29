import { Router } from "express";
import { AIController } from "./ai.controller";
import { authenticateJWT } from "../../middleware/auth";

const router = Router();

router.get("/job/:id", authenticateJWT, AIController.getJobStatus);

export default router;
