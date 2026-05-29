import { Router } from "express";
import { ReelsController } from "./reels.controller";
import { authenticateJWT } from "../../middleware/auth";

const router = Router();

router.use(authenticateJWT);

router.get("/", ReelsController.getBreakdowns);
router.post("/breakdown", ReelsController.breakdownReel);
router.delete("/:id", ReelsController.deleteBreakdown);

export default router;
