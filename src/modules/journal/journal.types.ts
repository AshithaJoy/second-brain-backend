export interface CreateJournalEntryInput {
  weekStart: string;
  mood: string;
  followers?: number;
  posts?: number;
  reach?: number;
  saves?: number;
  engagement?: string;
  reflection: string;
  wins: string;
  lessons: string;
  notes?: string | null;
}

export interface UpdateJournalEntryInput {
  weekStart?: string;
  mood?: string;
  followers?: number;
  posts?: number;
  reach?: number;
  saves?: number;
  engagement?: string;
  reflection?: string;
  wins?: string;
  lessons?: string;
  notes?: string | null;
}
