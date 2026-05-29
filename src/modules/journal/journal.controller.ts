import { Request, Response, NextFunction } from "express";
import { JournalService } from "./journal.service";
import { CreateJournalEntrySchema, UpdateJournalEntrySchema, JournalEntryIdSchema } from "./journal.schema";

export class JournalController {
  static async getJournalEntries(req: Request, res: Response, next: NextFunction) {
    try {
      const records = await JournalService.getJournalEntries(req.user!.id);
      return res.status(200).json(records);
    } catch (err) {
      next(err);
    }
  }

  static async getJournalEntryById(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = JournalEntryIdSchema.parse({ id: req.params.id });
      const record = await JournalService.getJournalEntryById(id, req.user!.id);
      return res.status(200).json(record);
    } catch (err) {
      next(err);
    }
  }

  static async createJournalEntry(req: Request, res: Response, next: NextFunction) {
    try {
      const body = CreateJournalEntrySchema.parse(req.body);
      const record = await JournalService.createJournalEntry(req.user!.id, body);
      return res.status(201).json(record);
    } catch (err) {
      next(err);
    }
  }

  static async updateJournalEntry(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = JournalEntryIdSchema.parse({ id: req.params.id });
      const body = UpdateJournalEntrySchema.parse(req.body);
      const record = await JournalService.updateJournalEntry(id, req.user!.id, body);
      return res.status(200).json(record);
    } catch (err) {
      next(err);
    }
  }

  static async deleteJournalEntry(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = JournalEntryIdSchema.parse({ id: req.params.id });
      await JournalService.deleteJournalEntry(id, req.user!.id);
      return res.status(200).json({ message: "Journal entry deleted successfully" });
    } catch (err) {
      next(err);
    }
  }
}
