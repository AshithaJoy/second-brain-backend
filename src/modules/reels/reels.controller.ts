import { Request, Response, NextFunction } from "express";
import { ReelsService } from "./reels.service";
import { BreakdownReelSchema } from "./reels.schema";

export class ReelsController {
  static async getBreakdowns(req: Request, res: Response, next: NextFunction) {
    try {
      const breakdowns = await ReelsService.getBreakdowns(req.user!.id);
      return res.status(200).json(breakdowns);
    } catch (err) {
      next(err);
    }
  }

  static async breakdownReel(req: Request, res: Response, next: NextFunction) {
    try {
      const { url } = BreakdownReelSchema.parse(req.body);
      const job = await ReelsService.breakdownReel(url, req.user!.id);
      return res.status(201).json(job);
    } catch (err) {
      next(err);
    }
  }

  static async deleteBreakdown(req: Request, res: Response, next: NextFunction) {
    try {
      await ReelsService.deleteBreakdown(req.params.id, req.user!.id);
      return res.status(200).json({ message: "Breakdown deleted successfully" });
    } catch (err) {
      next(err);
    }
  }
}
