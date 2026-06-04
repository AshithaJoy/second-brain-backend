import { Router } from "express";
import { BRollController } from "./broll.controller";
import { authenticateJWT } from "../../middleware/auth";

const router = Router();

router.use(authenticateJWT);

router.get("/", BRollController.getBRolls);
router.post("/", BRollController.createBRoll);
router.post("/upload-signature", BRollController.getUploadSignature);
router.get("/:id", BRollController.getBRollById);
router.put("/:id", BRollController.updateBRoll);
router.delete("/:id", BRollController.deleteBRoll);

export default router;
