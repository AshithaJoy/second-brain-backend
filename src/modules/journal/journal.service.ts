import { JournalRepository } from "./journal.repository";
import { CreateJournalEntryInput, UpdateJournalEntryInput } from "./journal.types";

export class JournalService {
  static async getJournalEntries(userId: string) {
    return JournalRepository.findMany(userId);
  }

  static async getJournalEntryById(id: string, userId: string) {
    const record = await JournalRepository.findById(id, userId);
    if (!record) {
      const err: any = new Error("Journal entry not found");
      err.statusCode = 404;
      throw err;
    }
    return record;
  }

  static async createJournalEntry(userId: string, data: CreateJournalEntryInput) {
    return JournalRepository.create(userId, data);
  }

  static async updateJournalEntry(id: string, userId: string, data: UpdateJournalEntryInput) {
    await this.getJournalEntryById(id, userId);
    return JournalRepository.update(id, userId, data);
  }

  static async deleteJournalEntry(id: string, userId: string) {
    await this.getJournalEntryById(id, userId);
    return JournalRepository.delete(id, userId);
  }
}
