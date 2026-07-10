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
  GitHubLinkResponse
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
    // With cookie-based auth the token is HttpOnly — JS cannot read it.
    // The browser forwards the cookie automatically when it navigates to the
    // backend URL, so the protect middleware authenticates the user server-side.
    // We only guard locally using the in-memory login flag.
    if (!this.authService.loggedIn.value) {
      console.error('GithubService: user is not logged in.');
      return;
    }

    // Clear trialStatus payload (including stagnant githubLogin overrides) before starting the linking flow.
    this._trialStatus.next(null);
    this.clearRepoCache();

    // No ?token= needed — the HttpOnly cookie is sent automatically by the browser.
    const redirectUrl = `${this.baseUrl}/auth/github`;
    window.location.href = redirectUrl;
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
