import { Router } from "express";
import { JournalController } from "./journal.controller";
import { authenticateJWT } from "../../middleware/auth";

const router = Router();

router.use(authenticateJWT);

router.get("/", JournalController.getJournalEntries);
router.post("/", JournalController.createJournalEntry);
router.get("/:id", JournalController.getJournalEntryById);
router.put("/:id", JournalController.updateJournalEntry);
router.delete("/:id", JournalController.deleteJournalEntry);

export default router;
