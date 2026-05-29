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
}
