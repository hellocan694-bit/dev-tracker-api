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
  /** Assigned developer's ObjectId — null if unassigned (schema v2) */
  assignedTo?: string | null;
  /** Completion percentage 0-100 (schema v2) */
  progress?: number;
}

export interface TaskResponse {
  message: string;
  task: Task;
}

/**
 * Payload for PATCH /dev/tasks/updatetask/:projectId/:taskId
 * All fields optional — at least one must be sent.
 * Admin / Owner / canManageTasks: all fields.
 * Assigned Developer: only status + progress.
 */
export interface UpdateTaskPayload {
  title?: string;
  estimatedHours?: number;
  deadline?: string;
  assignedTo?: string;
  status?: 'todo' | 'in-progress' | 'done';
  progress?: number;
}

/**
 * Payload for PATCH /dev/projectdev/updateproject/:id
 * All fields optional — at least one must be sent.
 */
export interface UpdateProjectPayload {
  name?: string;
  clientName?: string;
  hourlyRate?: number;
  description?: string;
  status?: 'active' | 'paused' | 'completed';
}