import { Router } from "express";
import { PlannerController } from "./planner.controller";
import { authenticateJWT } from "../../middleware/auth";

const router = Router();

router.use(authenticateJWT);

router.get("/posts", PlannerController.getPosts);
router.post("/posts", PlannerController.createPost);
router.get("/posts/:id", PlannerController.getPostById);
router.put("/posts/:id", PlannerController.updatePost);
router.delete("/posts/:id", PlannerController.deletePost);
router.post("/hooks", PlannerController.generateHooksByBody);
router.post("/captions", PlannerController.generateCaptions);

router.get("/shoots", PlannerController.getShoots);
router.post("/shoots", PlannerController.createShoot);
router.put("/shoots/:id", PlannerController.updateShoot);
router.delete("/shoots/:id", PlannerController.deleteShoot);

export default router;
