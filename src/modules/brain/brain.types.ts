export interface CreateDumpInput {
  title: string;
  text: string;
  mood: string;
  ts: string;
  archived?: boolean;
}

export interface UpdateDumpInput {
  title?: string;
  text?: string;
  mood?: string;
  ts?: string;
  archived?: boolean;
}
