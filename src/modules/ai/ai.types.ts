export interface AIJobResponse {
  id: string;
  queueName: string;
  status: string;
  resultJson: string | null;
  userId: string;
  createdAt: Date;
  updatedAt: Date;
}
