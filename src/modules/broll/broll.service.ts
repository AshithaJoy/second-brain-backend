import { BRollRepository } from "./broll.repository";
import { CreateBRollInput, UpdateBRollInput } from "./broll.types";

export class BRollService {
  static async getBRolls(userId: string) {
    return BRollRepository.findMany(userId);
  }

  static async getBRollById(id: string, userId: string) {
    const record = await BRollRepository.findById(id, userId);
    if (!record) {
      const err: any = new Error("B-Roll clip not found");
      err.statusCode = 404;
      throw err;
    }
    return record;
  }

  static async createBRoll(userId: string, data: CreateBRollInput) {
    return BRollRepository.create(userId, data);
  }

  static async updateBRoll(id: string, userId: string, data: UpdateBRollInput) {
    await this.getBRollById(id, userId);
    return BRollRepository.update(id, userId, data);
  }

  static async deleteBRoll(id: string, userId: string) {
    await this.getBRollById(id, userId);
    return BRollRepository.delete(id, userId);
  }
}
