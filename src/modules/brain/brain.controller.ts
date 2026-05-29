import { Request, Response, NextFunction } from "express";
import { BrainService } from "./brain.service";
import { CreateDumpSchema, UpdateDumpSchema, DumpIdSchema, RewriteDumpSchema } from "./brain.schema";

export class BrainController {
  static async getDumps(req: Request, res: Response, next: NextFunction) {
    try {
      const dumps = await BrainService.getDumps(req.user!.id);
      return res.status(200).json(dumps);
    } catch (err) {
      next(err);
    }
  }

  static async getDumpById(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = DumpIdSchema.parse({ id: req.params.id });
      const dump = await BrainService.getDumpById(id, req.user!.id);
      return res.status(200).json(dump);
    } catch (err) {
      next(err);
    }
  }

  static async createDump(req: Request, res: Response, next: NextFunction) {
    try {
      const body = CreateDumpSchema.parse(req.body);
      const dump = await BrainService.createDump(req.user!.id, body);
      return res.status(201).json(dump);
    } catch (err) {
      next(err);
    }
  }

  static async updateDump(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = DumpIdSchema.parse({ id: req.params.id });
      const body = UpdateDumpSchema.parse(req.body);
      const dump = await BrainService.updateDump(id, req.user!.id, body);
      return res.status(200).json(dump);
    } catch (err) {
      next(err);
    }
  }

  static async deleteDump(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = DumpIdSchema.parse({ id: req.params.id });
      await BrainService.deleteDump(id, req.user!.id);
      return res.status(200).json({ message: "Dump deleted successfully" });
    } catch (err) {
      next(err);
    }
  }

  static async rewriteDump(req: Request, res: Response, next: NextFunction) {
    try {
      const { dumpId } = RewriteDumpSchema.parse(req.body);
      const job = await BrainService.rewriteDump(dumpId, req.user!.id);
      return res.status(201).json(job);
    } catch (err) {
      next(err);
    }
  }
}
