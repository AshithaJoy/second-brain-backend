import { Request, Response, NextFunction } from "express";
import { BRollService } from "./broll.service";
import { CreateBRollSchema, UpdateBRollSchema, BRollIdSchema } from "./broll.schema";
import { v2 as cloudinary } from "cloudinary";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

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

  static async getUploadSignature(req: Request, res: Response, next: NextFunction) {
    try {
      const timestamp = Math.round((new Date).getTime()/1000);
      const signature = cloudinary.utils.api_sign_request({
        timestamp: timestamp,
        folder: "broll-vault" // optional, you can change this
      }, process.env.CLOUDINARY_API_SECRET || "");

      return res.status(200).json({
        signature,
        timestamp,
        cloudName: process.env.CLOUDINARY_CLOUD_NAME,
        apiKey: process.env.CLOUDINARY_API_KEY
      });
    } catch (err) {
      next(err);
    }
  }
}
