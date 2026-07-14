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
  // ── Enriched fields (Agent 1 expansion) ──────────────────────────────────
  forks: number;
  openIssues: number;
  sizeKb: number;            // repo size in KB
  defaultBranch: string;
  pushedAt: string;
  topics: string[];
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

// ─── Agent 3: File Analytics Interfaces ────────────────────────────────────────

/**
 * A single enriched file entry from the Git Trees API.
 * Strictly typed to prevent arbitrary property access.
 */
export interface FileEntry {
  path: string;        // full path within repo, e.g. "src/app/app.module.ts"
  name: string;        // filename only, e.g. "app.module.ts"
  sha: string;         // Git blob SHA
  sizeBytes: number;   // raw bytes
  sizeKb: number;      // rounded to 2 decimal places
  extension: string;   // lowercase extension without dot, e.g. "ts"
  language: string | null; // detected language or null
  directory: string;   // parent directory path, empty string for root files
}

export interface LangBreakdownEntry {
  language: string;
  count: number;
  percent: number;     // 0–100
}

export interface RepoContentsResponse {
  message: string;
  repoFullName: string;
  branch: string;
  truncated: boolean;        // true if GitHub truncated the tree (> 100k entries)
  totalFiles: number;
  files: FileEntry[];
  langBreakdown: LangBreakdownEntry[];
}
