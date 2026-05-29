import { Router } from "express";
import { BrainController } from "./brain.controller";
import { authenticateJWT } from "../../middleware/auth";

const router = Router();

router.use(authenticateJWT);

router.get("/dumps", BrainController.getDumps);
router.post("/dumps", BrainController.createDump);
router.post("/rewrite", BrainController.rewriteDump);
router.get("/dumps/:id", BrainController.getDumpById);
router.put("/dumps/:id", BrainController.updateDump);
router.delete("/dumps/:id", BrainController.deleteDump);

export default router;
