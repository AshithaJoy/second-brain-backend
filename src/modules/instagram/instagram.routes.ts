import { Router } from "express";
import { InstagramController } from "./instagram.controller";
import { authenticateJWT } from "../../middleware/auth";

const router = Router();

// Public redirect endpoint triggered by Meta
router.get("/oauth/callback", InstagramController.oauthCallback);

// Protect other routes with JWT authentication
router.use(authenticateJWT);

router.get("/oauth/start", InstagramController.startOAuth);
router.post("/connect", InstagramController.connect);
router.get("/profile", InstagramController.getProfile);
router.get("/media", InstagramController.getMedia);
router.delete("/disconnect", InstagramController.disconnect);
router.get("/status", InstagramController.getStatus);
router.post("/sync", InstagramController.sync);
router.get("/intelligence", InstagramController.getIntelligence);

export default router;
