// ─────────────────────────────────────────────────────────────────────────────
// ARIA 3-Agent Onboarding System — Data Models
// ─────────────────────────────────────────────────────────────────────────────

/** A single file flagged as high-priority by the Context Synthesizer agent */
export interface PriorityFile {
  /** File path relative to repo root */
  path: string;
  /** Human-readable reason this file is critical */
  reason: string;
  /** Optional risk level badge */
  riskLevel?: 'low' | 'medium' | 'high' | 'critical';
}

/** A bottleneck or risk detected inside the project */
export interface BottleneckAlert {
  /** Short title for the bottleneck */
  title: string;
  /** Detailed description */
  description: string;
  /** Severity tier used to control the icon/color */
  severity: 'warning' | 'danger' | 'info';
}

/** Live snapshot of the project fetched by the Data Miner agent */
export interface ProjectSnapshot {
  /** Project display name */
  projectName: string;
  /** One-line description */
  summary: string;
  /** Total tasks in the project */
  totalTasks: number;
  /** Tasks currently in-progress */
  activeTasks: number;
  /** Tasks already completed */
  completedTasks: number;
  /** Overall completion percentage (0-100) */
  completionPercentage: number;
  /** Team size (number of developers) */
  teamSize: number;
  /** Primary tech stack tags */
  techStack?: string[];
}

/** The first concrete task assigned to the onboarded developer */
export interface FirstMission {
  /** Task title */
  title: string;
  /** Detailed task description */
  description: string;
  /** Estimated effort in hours */
  estimatedHours: number;
  /** ISO date-string deadline */
  deadline: string;
  /** Task priority */
  priority: 'low' | 'medium' | 'high' | 'critical';
  /** Relevant file paths or modules */
  relatedFiles?: string[];
}

/**
 * Root shape of the ARIA onboarding message produced by the Persona Writer agent.
 * Received via:
 *   • Socket.io event  → `onboarding_message`
 *   • REST response    → POST /onboarding/trigger/sync
 */
export interface OnboardingMessage {
  /** Subject line – displayed in the modal header */
  subject: string;
  /** Personalised greeting paragraph written by the Persona Writer */
  greeting: string;
  /** Aggregated project metrics from the Data Miner */
  projectSnapshot: ProjectSnapshot;
  /** Array of files the developer must review immediately */
  priorityFiles: PriorityFile[];
  /** Risks or blockers detected in the project */
  bottleneckAlerts: BottleneckAlert[];
  /** The very first task the developer should tackle */
  firstMission: FirstMission;
  /** Sign-off line from ARIA */
  closingSignal: string;
}

/** Wrapper returned by POST /onboarding/trigger/sync */
export interface OnboardingApiResponse {
  success: boolean;
  message: string;
  data: OnboardingMessage;
}
