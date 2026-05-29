import { Request, Response, NextFunction } from "express";
import { BRollService } from "./broll.service";
import { CreateBRollSchema, UpdateBRollSchema, BRollIdSchema } from "./broll.schema";

export class BRollController {
  static async getBRolls(req: Request, res: Response, next: NextFunction) {
    try {
      const records = await BRollService.getBRolls(req.user!.id);
      return res.status(200).json(records);
    } catch (err) {
      next(err);
    }
  }

  static async getBRollById(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = BRollIdSchema.parse({ id: req.params.id });
      const record = await BRollService.getBRollById(id, req.user!.id);
      return res.status(200).json(record);
    } catch (err) {
      next(err);
    }
  }

  static async createBRoll(req: Request, res: Response, next: NextFunction) {
    try {
      const body = CreateBRollSchema.parse(req.body);
      const record = await BRollService.createBRoll(req.user!.id, body);
      return res.status(201).json(record);
    } catch (err) {
      next(err);
    }
  }

  static async updateBRoll(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = BRollIdSchema.parse({ id: req.params.id });
      const body = UpdateBRollSchema.parse(req.body);
      const record = await BRollService.updateBRoll(id, req.user!.id, body);
      return res.status(200).json(record);
    } catch (err) {
      next(err);
    }
  }

  static async deleteBRoll(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = BRollIdSchema.parse({ id: req.params.id });
      await BRollService.deleteBRoll(id, req.user!.id);
      return res.status(200).json({ message: "B-Roll clip deleted successfully" });
    } catch (err) {
      next(err);
    }
  }
}
