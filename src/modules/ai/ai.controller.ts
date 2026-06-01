import { Request, Response, NextFunction } from "express";
import { GetJobSchema } from "./ai.schema";
import { AIService } from "./ai.service";

export class AIController {
  static async getJobStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = GetJobSchema.parse({ id: req.params.id });
      const job = await AIService.getJobStatus(id, req.user!.id);
      return res.status(200).json(job);
    } catch (err) {
      next(err);
    }
  }
}
