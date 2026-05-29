import { Request, Response, NextFunction } from "express";
import { CollabsService } from "./collabs.service";
import {
  CreateCollabSchema,
  UpdateCollabSchema,
  CollabIdSchema,
  EstimateCollabSchema,
  DiscoverBrandsSchema,
} from "./collabs.schema";

export class CollabsController {
  static async getCollabs(req: Request, res: Response, next: NextFunction) {
    try {
      const collabs = await CollabsService.getCollabs(req.user!.id);
      return res.status(200).json(collabs);
    } catch (err) {
      next(err);
    }
  }

  static async getCollabById(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = CollabIdSchema.parse({ id: req.params.id });
      const collab = await CollabsService.getCollabById(id, req.user!.id);
      return res.status(200).json(collab);
    } catch (err) {
      next(err);
    }
  }

  static async createCollab(req: Request, res: Response, next: NextFunction) {
    try {
      const body = CreateCollabSchema.parse(req.body);
      const collab = await CollabsService.createCollab(req.user!.id, body);
      return res.status(201).json(collab);
    } catch (err) {
      next(err);
    }
  }

  static async updateCollab(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = CollabIdSchema.parse({ id: req.params.id });
      const body = UpdateCollabSchema.parse(req.body);
      const collab = await CollabsService.updateCollab(id, req.user!.id, body);
      return res.status(200).json(collab);
    } catch (err) {
      next(err);
    }
  }

  static async deleteCollab(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = CollabIdSchema.parse({ id: req.params.id });
      await CollabsService.deleteCollab(id, req.user!.id);
      return res.status(200).json({ message: "Collab deleted successfully" });
    } catch (err) {
      next(err);
    }
  }

  static async estimateCollab(req: Request, res: Response, next: NextFunction) {
    try {
      const { collabId, brandName, profileUrl, niche } = EstimateCollabSchema.parse(req.body);
      const job = await CollabsService.estimateCollab(collabId, brandName, profileUrl, niche, req.user!.id);
      return res.status(201).json(job);
    } catch (err) {
      next(err);
    }
  }

  static async discoverBrands(req: Request, res: Response, next: NextFunction) {
    try {
      const { niche } = DiscoverBrandsSchema.parse(req.body);
      const job = await CollabsService.discoverBrands(niche, req.user!.id);
      return res.status(201).json(job);
    } catch (err) {
      next(err);
    }
  }
}
