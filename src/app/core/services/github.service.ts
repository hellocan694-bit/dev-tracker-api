import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, Subject, BehaviorSubject, of, throwError } from 'rxjs';
import { map, tap, catchError } from 'rxjs/operators';
import { environment } from 'src/environment/environment';
import {
  TrialStatus,
  GitHubRepo,
  LinkedRepo,
  DeveloperActivity,
  ProAccessError,
  GitHubLinkResponse,
  RepoContentsResponse
} from 'src/app/shared/interfaces/github';
import { AuthService } from './auth.service';

@Injectable({ providedIn: 'root' })
export class GithubService {
  private readonly baseUrl = environment.apiUrl;
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  // ── Repo cache ─────────────────────────────────────────────────────────────
  private reposCache: { data: GitHubRepo[]; timestamp: number } | null = null;

  // ── Trial status stream (shared across all components) ─────────────────────
  private _trialStatus = new BehaviorSubject<TrialStatus | null>(null);
  readonly trialStatus$ = this._trialStatus.asObservable();

  // ── 403 error bus — any component can subscribe to react to pro-access failures
  private _proAccessError = new Subject<ProAccessError>();
  readonly proAccessError$ = this._proAccessError.asObservable();

  constructor(private http: HttpClient, private authService: AuthService) { }

  // ───────────────────────────────────────────────────────────────────────────
  // 1.  OAuth Connect — redirect browser to GitHub OAuth flow
  // ───────────────────────────────────────────────────────────────────────────
  connectToGitHub(): void {
    if (!this.authService.loggedIn.value) {
      console.error('GithubService: user is not logged in.');
      return;
    }

    // The real JWT is in an HttpOnly cookie JS cannot read.
    // Step 1: Call the protected endpoint — browser sends the cookie automatically.
    //         Backend verifies it and returns a short-lived (5 min) link-only JWT.
    // Step 2: Redirect to the OAuth initiate route with that token in the URL.
    //         Backend embeds it as `state`, GitHub echoes it back on callback.
    this._trialStatus.next(null);
    this.clearRepoCache();

    this.http.get<{ status: string; linkToken: string }>(
      `${this.baseUrl}/auth/github/get-link-token`
    ).subscribe({
      next: ({ linkToken }) => {
        window.location.href = `${this.baseUrl}/auth/github?token=${encodeURIComponent(linkToken)}`;
      },
      error: (err) => {
        console.error('GithubService: failed to obtain link token.', err);
      }
    });
  }

  // ───────────────────────────────────────────────────────────────────────────
  // 2.  Trial Status
  // ───────────────────────────────────────────────────────────────────────────
  getTrialStatus(): Observable<TrialStatus> {
    return this.http.get<{ message: string; data: TrialStatus }>(`${this.baseUrl}/github/trial-status`).pipe(
      map(res => res.data),
      tap(status => this._trialStatus.next(status)),
      catchError(err => {
        this._trialStatus.next(null);
        return throwError(() => err);
      })
    );
  }

  // ───────────────────────────────────────────────────────────────────────────
  // 3.  Repositories — with 5-minute in-memory cache
  // ───────────────────────────────────────────────────────────────────────────
  getRepos(): Observable<GitHubRepo[]> {
    const now = Date.now();
    if (this.reposCache && now - this.reposCache.timestamp < this.CACHE_TTL) {
      return of(this.reposCache.data);
    }

    return this.http.get<{ message: string; count: number; data: GitHubRepo[] }>(`${this.baseUrl}/github/repos`).pipe(
      map(res => res.data),
      tap(data => (this.reposCache = { data, timestamp: Date.now() })),
      catchError((err: HttpErrorResponse) => {
        this._handleProAccessError(err);
        return throwError(() => err);
      })
    );
  }

  /** Invalidate the repo cache (call after selectRepos or re-link) */
  clearRepoCache(): void {
    this.reposCache = null;
    this._contentsCache.clear();
  }

  // ───────────────────────────────────────────────────────────────────────────
  // 3b. Repository File Analytics (enriched file tree)
  // ───────────────────────────────────────────────────────────────────────────
  private _contentsCache = new Map<string, { data: RepoContentsResponse; timestamp: number }>();

  /**
   * Fetches enriched file tree for a repo. Caches per-repo for CACHE_TTL ms.
   * Agent 3: all data is strictly typed; no raw HTML rendered from API response.
   */
  getRepoContents(owner: string, repo: string, branch = 'HEAD'): Observable<RepoContentsResponse> {
    const cacheKey = `${owner}/${repo}@${branch}`;
    const cached = this._contentsCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      return of(cached.data);
    }

    return this.http
      .get<RepoContentsResponse>(`${this.baseUrl}/github/repos/${owner}/${repo}/contents`, {
        params: { branch },
      })
      .pipe(
        tap((data) => this._contentsCache.set(cacheKey, { data, timestamp: Date.now() })),
        catchError((err: HttpErrorResponse) => {
          this._handleProAccessError(err);
          return throwError(() => err);
        })
      );
  }

  // ───────────────────────────────────────────────────────────────────────────
  // 4.  Select / Save Repositories
  // ───────────────────────────────────────────────────────────────────────────
  selectRepos(repos: LinkedRepo[]): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/github/select-repos`, { repos }).pipe(
      tap(() => this.clearRepoCache()),
      catchError((err: HttpErrorResponse) => {
        this._handleProAccessError(err);
        return throwError(() => err);
      })
    );
  }

  // ───────────────────────────────────────────────────────────────────────────
  // 5.  Developer Activity — derives from the trial/profile data in the future;
  //     for now fetches from the same trial endpoint and returns an empty array
  //     when the activityLog isn't surfaced by a dedicated endpoint yet.
  // ───────────────────────────────────────────────────────────────────────────
  getActivityFeed(): Observable<DeveloperActivity[]> {
    return this.http.get<{ message: string, data: DeveloperActivity[] }>(`${this.baseUrl}/github/activity`).pipe(
      map(res => res.data),
      catchError((err: HttpErrorResponse) => {
        this._handleProAccessError(err);
        return throwError(() => err);
      })
    );
  }

  // ───────────────────────────────────────────────────────────────────────────
  // 6.  Internal — parse structured 403 and broadcast on error bus
  // ───────────────────────────────────────────────────────────────────────────
  private _handleProAccessError(err: HttpErrorResponse): void {
    if (err.status === 403 && err.error && (err.error.error === 'trial_expired' || err.error.error === 'github_not_linked')) {
      this._proAccessError.next(err.error as ProAccessError);
    }
  }
}
