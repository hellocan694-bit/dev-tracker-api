import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, of, tap } from 'rxjs';
import { environment } from 'src/environment/environment';

import { Developer } from 'src/app/shared/interfaces/developer';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private baseUrl = environment.apiUrl;

  /**
   * Auth state is now driven by the developer profile stored in memory only.
   * We no longer rely on a token in sessionStorage / localStorage because the
   * JWT lives exclusively in an HttpOnly cookie that JS cannot read.
   */
  private _currentUser = new BehaviorSubject<Developer | null>(null);
  currentUser$ = this._currentUser.asObservable();

  /**
   * Cached user-profile stream. Components that need profile data should
   * subscribe to this instead of calling DeveloperService.getProfile() every
   * time — the cache is automatically seeded on login and cleared on logout.
   */
  private userProfileSource = new BehaviorSubject<Developer | null>(null);
  /** Read-only stream of the cached developer profile. */
  userProfile$ = this.userProfileSource.asObservable();

  // Derived login flag — truthy when we have a profile in memory
  readonly loggedIn = new BehaviorSubject<boolean>(false);
  isLoggedIn$ = this.loggedIn.asObservable();

  constructor(private http: HttpClient) {
    // Restore profile from localStorage on page refresh (no token involved).
    const storedDev = localStorage.getItem('developerProfile');
    if (storedDev) {
      try {
        const dev = JSON.parse(storedDev);
        this._currentUser.next(dev);
        this.userProfileSource.next(dev);
        this.loggedIn.next(true);
      } catch (e) { }
    }
  }

  /**
   * Called after a successful auth response.
   * Token is in the HttpOnly cookie — we only handle the profile object here.
   */
  private handleAuthSuccess(res: any) {
    if (res.developer) {
      if (res.developer.name) {
        localStorage.setItem('userName', res.developer.name);
      }
      localStorage.setItem('developerProfile', JSON.stringify(res.developer));
      this._currentUser.next(res.developer);
      this.userProfileSource.next(res.developer);  // seed the profile cache
    }
    localStorage.setItem('isUserAuthenticated', 'true');
    this.loggedIn.next(true);
  }

  /**
   * Public entry-point for callers that receive auth data outside an HTTP
   * observable (e.g. the GitHub redirect flow where the profile arrives via
   * URL query params, not a response body).
   * Idempotent — safe to call even if handleAuthSuccess already ran.
   */
  markLoggedIn(developer: any): void {
    if (developer.name) {
      localStorage.setItem('userName', developer.name);
    }
    localStorage.setItem('developerProfile', JSON.stringify(developer));
    localStorage.setItem('isUserAuthenticated', 'true');
    this._currentUser.next(developer);
    this.userProfileSource.next(developer);  // seed the profile cache
    this.loggedIn.next(true);
  }

  get userProfileValue(): Developer | null {
    return this.userProfileSource.value;
  }

  /**
   * Cache-gate: returns the cached profile instantly (as an Observable) if
   * already populated. Callers should delegate the actual HTTP fetch to
   * DeveloperService.getProfile() and then call updateProfileCache() with
   * the fresh data so all subscribers receive it.
   */
  getCachedProfile(): Observable<Developer | null> {
    return of(this.userProfileSource.value);
  }

  /**
   * Push a fresh Developer object into the shared profile cache.
   * Call this after a successful profile update so every component that
   * subscribes to userProfile$ receives the new data without a re-fetch.
   */
  updateProfileCache(developer: Developer): void {
    localStorage.setItem('developerProfile', JSON.stringify(developer));
    this._currentUser.next(developer);
    this.userProfileSource.next(developer);
  }

  googleLogin(idToken: string): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/auth/google-login`, { idToken }).pipe(
      tap((res) => this.handleAuthSuccess(res))
    );
  }

  githubLogin(code: string): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/auth/github-login`, { code }).pipe(
      tap((res) => this.handleAuthSuccess(res))
    );
  }

  register(name: string, email: string, password: string): Observable<Developer> {
    return this.http.post<Developer>(`${this.baseUrl}/auth/dev/register/registerdevs`, { name, email, password });
  }

  login(email: string, password: string): Observable<{ developer: Developer }> {
    return this.http.post<{ developer: Developer }>(
      `${this.baseUrl}/auth/dev/login/logindevs`,
      { email, password }
    ).pipe(
      tap((res) => this.handleAuthSuccess(res))
    );
  }

  createAcc(otp: number, token: string): Observable<Developer> {
    return this.http.post<Developer>(`${this.baseUrl}/auth/dev/register/creatdevacc`, { otp, token });
  }

  sendEmail(email: string) {
    return this.http.post(`${this.baseUrl}/developerSettings/forgotpassword`, { email });
  }

  updatePassword(email: string, otp: string, newPassword: string): Observable<any> {
    return this.http.post(`${this.baseUrl}/developerSettings/changepassword`, { email, otp, newPassword });
  }

  /**
   * Cookie-based logout: calls the backend to clear the HttpOnly cookie,
   * then wipes all local state.
   * withCredentials is added automatically by the CredentialsInterceptor.
   */
  logout(): Observable<any> {
    return this.http.post(`${this.baseUrl}/auth/logout`, {}).pipe(
      tap(() => this.clearLocalState())
    );
  }

  /** Wipes in-memory and localStorage auth state (no token involved). */
  clearLocalState(): void {
    localStorage.removeItem('developerProfile');
    localStorage.removeItem('isUserAuthenticated');
    localStorage.removeItem('userName');
    localStorage.removeItem('email');
    localStorage.removeItem('userId');
    localStorage.removeItem('user');
    this._currentUser.next(null);
    this.userProfileSource.next(null);  // clear the profile cache
    this.loggedIn.next(false);
  }
}
