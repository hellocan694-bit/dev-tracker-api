// ─── Enums ─────────────────────────────────────────────────────────────
export type FeedbackType = 'bug' | 'feature_request' | 'general' | 'improvement';
export type FeedbackStatus = 'pending' | 'under_review' | 'resolved' | 'closed';
export type FeedbackRating = 1 | 2 | 3 | 4 | 5;

// ─── Core Model ────────────────────────────────────────────────────────
export interface Feedback {
  _id: string;
  developer: string | { _id: string; id?: string;[key: string]: any };
  type: FeedbackType;
  subject: string;
  message: string;
  rating: FeedbackRating;
  status: FeedbackStatus;
  adminNote?: string | null;
  resolvedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

/** Public-facing subset returned for non-owner, non-admin callers (max 4 items) */
export interface PublicFeedback {
  type: FeedbackType;
  subject: string;
  message: string;
  rating: FeedbackRating;
  createdAt: string;
}

// ─── Request Bodies ─────────────────────────────────────────────────────
export interface CreateFeedbackDto {
  subject: string;          // required, 3–120 chars
  message: string;          // required, 10–2000 chars
  rating: FeedbackRating;   // required, 1–5
  type?: FeedbackType;      // optional, default: 'general'
}

export interface UpdateFeedbackDto {
  subject?: string;         // 3–120 chars
  message?: string;         // 10–2000 chars
  rating?: FeedbackRating;  // 1–5
  type?: FeedbackType;
  // Admin-only fields
  status?: FeedbackStatus;
  adminNote?: string | null; // max 1000 chars, '' or null to clear
}

// ─── API Response Shapes ────────────────────────────────────────────────
export interface FeedbackListResponse {
  status: string;
  results: number;
  data: { feedbacks: Feedback[] };
}

export interface PublicFeedbackListResponse {
  status: string;
  results: number;
  data: { feedbacks: PublicFeedback[] };
}

export interface SingleFeedbackResponse {
  status: string;
  data: { feedback: Feedback };
}

export interface CountResponse {
  status: string;
  data: { count: number; type?: string; status?: string; rating?: number };
}
