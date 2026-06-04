export interface CreateBRollInput {
  title: string;
  description: string;
  mood: string;
  visualTags: string[];
  emotionTags: string[];
  location?: string | null;
  lighting?: string | null;
  motionType?: string | null;
  audioFeeling?: string | null;
  timeOfDay?: string | null;
  weather?: string | null;
  clipType?: string;
  cinematicUse?: string | null;
  energy?: string;
  notes?: string | null;
  fileUrl?: string | null;
  thumbnailUrl?: string | null;
  favorite?: boolean;
  status?: "DRAFT" | "READY" | "ATTACHED" | "SCHEDULED" | "PUBLISHED" | "ARCHIVED";
  duration?: number | null;
  fileSize?: number | null;
  resolution?: string | null;
  mimeType?: string | null;
}

export interface UpdateBRollInput {
  title?: string;
  description?: string;
  mood?: string;
  visualTags?: string[];
  emotionTags?: string[];
  location?: string | null;
  lighting?: string | null;
  motionType?: string | null;
  audioFeeling?: string | null;
  timeOfDay?: string | null;
  weather?: string | null;
  clipType?: string;
  cinematicUse?: string | null;
  energy?: string;
  notes?: string | null;
  fileUrl?: string | null;
  thumbnailUrl?: string | null;
  favorite?: boolean;
  status?: "DRAFT" | "READY" | "ATTACHED" | "SCHEDULED" | "PUBLISHED" | "ARCHIVED";
  duration?: number | null;
  fileSize?: number | null;
  resolution?: string | null;
  mimeType?: string | null;
}
