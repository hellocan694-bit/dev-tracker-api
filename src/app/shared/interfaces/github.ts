// ─── GitHub Integration Interfaces ──────────────────────────────────────────
// Matches every JSON shape defined in GITHUB_API_DOCS.md

export interface TrialStatus {
  isPro: boolean;
  isPremium: boolean;          // true ONLY for paid subscribers (not trial users)
  githubLinked: boolean;
  githubLogin: string | null;
  active: boolean;
  daysRemaining: number | null; // null = perpetual/unlimited (paid with no end date)
  endsAt: string | null;
  linkedRepos?: LinkedRepo[];
}

export interface GitHubRepo {
  repoId: number;
  name: string;
  fullName: string;
  private: boolean;
  htmlUrl: string;
  description: string | null;
  language: string | null;
  stars: number;
  updatedAt: string;
}

/** Subset sent to POST /github/select-repos */
export interface LinkedRepo {
  repoId: number;
  name: string;
  fullName: string;
  private: boolean;
  htmlUrl: string;
  language: string | null;
}

/** Webhook-powered activity entry built from developer.github.activityLog */
export interface DeveloperActivity {
  type: 'push' | 'pull_request' | 'issues';
  repoFullName: string;
  message: string;
  sha?: string;
  url?: string;
  createdAt: string;
}

/** Structured 403 body from requireProAccess middleware */
export interface ProAccessError {
  error: 'trial_expired' | 'github_not_linked';
  message: string;
  remainingDays: number;
  endsAt: string | null;
}

/** Response from POST /github/link */
export interface GitHubLinkResponse {
  message: string;
  data: {
    githubLogin: string;
    trialStarted: boolean;
    proTrialEndDate: string;
  };
}

/** Query params delivered to /github/success by the backend redirect */
export interface GitHubSuccessParams {
  trialStarted: string;        // 'true' | 'false'
  githubLogin: string;
  proTrialEndDate: string;     // ISO date string
}
