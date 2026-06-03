import { Request, Response, NextFunction } from "express";
import { prisma } from "../../config/db";
import { SaveProfileSchema } from "./profile.schema";

export class ProfileController {
  static async getProfile(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const profile = await prisma.creatorProfile.findUnique({
        where: { userId },
      });

      if (!profile) {
        // Auto-create default profile for authenticated user
        const createdProfile = await prisma.creatorProfile.create({
          data: {
            userId,
            primaryNiche: "",
            secondaryNiches: JSON.stringify([]),
            primaryGoal: "",
            audienceSize: "",
            creatorStage: "",
            postingFrequency: "",
            preferredFormats: JSON.stringify([]),
            contentPillars: JSON.stringify([]),
            toneOfVoice: "",
            biggestChallenge: "",
            aiAssistanceLevel: "",
          },
        });
        console.log(`Recovered missing CreatorProfile for user ${userId}`);
        return res.status(200).json(createdProfile);
      }

      return res.status(200).json(profile);
    } catch (err) {
      next(err);
    }
  }

  static async saveProfile(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const data = SaveProfileSchema.parse(req.body);

      // Upsert profile
      const profile = await prisma.creatorProfile.upsert({
        where: { userId },
        create: {
          userId,
          primaryNiche: data.primaryNiche,
          secondaryNiches: JSON.stringify(data.secondaryNiches),
          primaryGoal: data.primaryGoal,
          audienceSize: data.audienceSize,
          creatorStage: data.creatorStage,
          postingFrequency: data.postingFrequency,
          preferredFormats: JSON.stringify(data.preferredFormats),
          contentPillars: JSON.stringify(data.contentPillars),
          toneOfVoice: data.toneOfVoice,
          biggestChallenge: data.biggestChallenge,
          aiAssistanceLevel: data.aiAssistanceLevel,
          completedAt: new Date(),
        },
        update: {
          primaryNiche: data.primaryNiche,
          secondaryNiches: JSON.stringify(data.secondaryNiches),
          primaryGoal: data.primaryGoal,
          audienceSize: data.audienceSize,
          creatorStage: data.creatorStage,
          postingFrequency: data.postingFrequency,
          preferredFormats: JSON.stringify(data.preferredFormats),
          contentPillars: JSON.stringify(data.contentPillars),
          toneOfVoice: data.toneOfVoice,
          biggestChallenge: data.biggestChallenge,
          aiAssistanceLevel: data.aiAssistanceLevel,
          completedAt: new Date(),
        },
      });

      return res.status(201).json(profile);
    } catch (err) {
      next(err);
    }
  }

  static async updateProfile(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const data = SaveProfileSchema.partial().parse(req.body);

      const existingProfile = await prisma.creatorProfile.findUnique({
        where: { userId },
      });

      if (!existingProfile) {
        return res.status(404).json({ error: "Creator profile not found" });
      }

      // Convert arrays to JSON strings if they are provided
      const updateData: any = { ...data };
      if (data.secondaryNiches) {
        updateData.secondaryNiches = JSON.stringify(data.secondaryNiches);
      }
      if (data.preferredFormats) {
        updateData.preferredFormats = JSON.stringify(data.preferredFormats);
      }
      if (data.contentPillars) {
        updateData.contentPillars = JSON.stringify(data.contentPillars);
      }

      const profile = await prisma.creatorProfile.update({
        where: { userId },
        data: updateData,
      });

      return res.status(200).json(profile);
    } catch (err) {
      next(err);
    }
  }

  static async getCompletionStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const profile = await prisma.creatorProfile.findUnique({
        where: { userId },
      });

      if (!profile) {
        return res.status(200).json({
          complete: false,
          score: 0,
          checklist: {
            niche: false,
            goals: false,
            audience: false,
            formats: false,
            pillars: false,
            tone: false,
            challenge: false,
          },
        });
      }

      // Helper to parse arrays from JSON database fields if they are strings
      const parseJsonArray = (val: any) => {
        if (!val) return [];
        if (typeof val === "string") {
          try {
            return JSON.parse(val);
          } catch (e) {
            return [];
          }
        }
        return Array.isArray(val) ? val : [];
      };

      const preferredFormats = parseJsonArray(profile.preferredFormats);
      const contentPillars = parseJsonArray(profile.contentPillars);

      const checklist = {
        niche: !!profile.primaryNiche,
        goals: !!profile.primaryGoal,
        audience: !!profile.audienceSize,
        formats: preferredFormats.length > 0,
        pillars: contentPillars.length > 0,
        tone: !!profile.toneOfVoice,
        challenge: !!profile.biggestChallenge,
      };

      const checkedItems = Object.values(checklist).filter(Boolean).length;
      const totalItems = Object.keys(checklist).length;
      const score = Math.round((checkedItems / totalItems) * 100);
      const complete = checkedItems === totalItems;

      return res.status(200).json({
        complete,
        score,
        checklist,
      });
    } catch (err) {
      next(err);
    }
  }
}
