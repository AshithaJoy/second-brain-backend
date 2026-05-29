import { Router } from "express";
import { CollabsController } from "./collabs.controller";
import { authenticateJWT } from "../../middleware/auth";

const router = Router();

router.use(authenticateJWT);

router.get("/", CollabsController.getCollabs);
router.post("/", CollabsController.createCollab);
router.post("/estimate", CollabsController.estimateCollab);
router.post("/discover", CollabsController.discoverBrands);
router.get("/:id", CollabsController.getCollabById);
router.put("/:id", CollabsController.updateCollab);
router.delete("/:id", CollabsController.deleteCollab);

export default router;
