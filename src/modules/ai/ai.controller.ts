import { Request, Response, NextFunction } from "express";
import { GetJobSchema } from "./ai.schema";
import { AIService } from "./ai.service";

export class AIController {
  static async getJobStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = GetJobSchema.parse({ id: req.params.id });
      const job = await AIService.getJobStatus(id);
      
      // Verify job belongs to logged-in user or if the user is authenticated
      if (req.user && job.userId !== req.user.id) {
        return res.status(403).json({ error: "Access to job is forbidden" });
      }

      return res.status(200).json(job);
    } catch (err) {
      next(err);
    }
  }
}
