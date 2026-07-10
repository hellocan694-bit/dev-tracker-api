export interface Task {
  _id: string;
  title: string;
  project: string;
  status: 'todo' | 'in-progress' | 'done';
  estimatedHours: number;
  spentHours: number;
  deadline: string | Date;
  earnedMoney: number;
  createdAt: string;
  updatedAt: string;
  statusActivity?: 'IDLE' | 'RUNNING' | 'PAUSED';
}

export interface TaskResponse {
  message: string;
  task: Task;
}