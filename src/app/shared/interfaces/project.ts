export interface Project {
  _id: string; 
  name: string;
  clientName: string;
  hourlyRate: number;
  description?: string; 
  status: 'active' | 'paused' | 'completed';
  isArchived: boolean;
  archivedAt?: Date;
  owner: string;
  createdAt: Date;
  updatedAt: Date;
}