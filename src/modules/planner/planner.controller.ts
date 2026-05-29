import { Request, Response, NextFunction } from "express";
import { PlannerService } from "./planner.service";
import { CreatePostSchema, UpdatePostSchema, PostIdSchema, GenerateHooksSchema, GenerateCaptionsSchema, CreateShootSchema, UpdateShootSchema, ShootIdSchema } from "./planner.schema";

export class PlannerController {
  static async getPosts(req: Request, res: Response, next: NextFunction) {
    try {
      const posts = await PlannerService.getPosts(req.user!.id);
      return res.status(200).json(posts);
    } catch (err) {
      next(err);
    }
  }

  static async getPostById(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = PostIdSchema.parse({ id: req.params.id });
      const post = await PlannerService.getPostById(id, req.user!.id);
      return res.status(200).json(post);
    } catch (err) {
      next(err);
    }
  }

  static async createPost(req: Request, res: Response, next: NextFunction) {
    try {
      const body = CreatePostSchema.parse(req.body);
      const post = await PlannerService.createPost(req.user!.id, body);
      return res.status(201).json(post);
    } catch (err) {
      next(err);
    }
  }

  static async updatePost(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = PostIdSchema.parse({ id: req.params.id });
      const body = UpdatePostSchema.parse(req.body);
      const post = await PlannerService.updatePost(id, req.user!.id, body);
      return res.status(200).json(post);
    } catch (err) {
      next(err);
    }
  }

  static async deletePost(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = PostIdSchema.parse({ id: req.params.id });
      await PlannerService.deletePost(id, req.user!.id);
      return res.status(200).json({ message: "Post deleted successfully" });
    } catch (err) {
      next(err);
    }
  }

  static async generateHooks(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = PostIdSchema.parse({ id: req.params.id });
      const job = await PlannerService.generateHooks(id, req.user!.id);
      return res.status(201).json(job);
    } catch (err) {
      next(err);
    }
  }

  static async generateHooksByBody(req: Request, res: Response, next: NextFunction) {
    try {
      const { postId } = GenerateHooksSchema.parse(req.body);
      const job = await PlannerService.generateHooks(postId, req.user!.id);
      return res.status(201).json(job);
    } catch (err) {
      next(err);
    }
  }

  static async generateCaptions(req: Request, res: Response, next: NextFunction) {
    try {
      const { postId } = GenerateCaptionsSchema.parse(req.body);
      const job = await PlannerService.generateCaptions(postId, req.user!.id);
      return res.status(201).json(job);
    } catch (err) {
      next(err);
    }
  }

  static async getShoots(req: Request, res: Response, next: NextFunction) {
    try {
      const shoots = await PlannerService.getShoots(req.user!.id);
      return res.status(200).json(shoots);
    } catch (err) {
      next(err);
    }
  }

  static async createShoot(req: Request, res: Response, next: NextFunction) {
    try {
      const body = CreateShootSchema.parse(req.body);
      const shoot = await PlannerService.createShoot(req.user!.id, body);
      return res.status(201).json(shoot);
    } catch (err) {
      next(err);
    }
  }

  static async updateShoot(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = ShootIdSchema.parse({ id: req.params.id });
      const body = UpdateShootSchema.parse(req.body);
      const shoot = await PlannerService.updateShoot(id, req.user!.id, body);
      return res.status(200).json(shoot);
    } catch (err) {
      next(err);
    }
  }

  static async deleteShoot(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = ShootIdSchema.parse({ id: req.params.id });
      await PlannerService.deleteShoot(id, req.user!.id);
      return res.status(200).json({ message: "Shoot deleted successfully" });
    } catch (err) {
      next(err);
    }
  }
}
