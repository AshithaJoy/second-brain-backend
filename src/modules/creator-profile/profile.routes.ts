import { Router } from "express";
import { ProfileController } from "./profile.controller";
import { authenticateJWT } from "../../middleware/auth";

const router = Router();

router.use(authenticateJWT);

router.get("/", ProfileController.getProfile);
router.post("/", ProfileController.saveProfile);
router.put("/", ProfileController.updateProfile);
router.get("/completion-status", ProfileController.getCompletionStatus);

export default router;
