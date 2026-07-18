import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, of, switchMap, tap } from 'rxjs';
import { environment } from 'src/environment/environment';
import { AuthService } from 'src/app/core/services/auth.service';
import { Developer } from 'src/app/shared/interfaces/developer';

@Injectable({
  providedIn: 'root'
})
export class DeveloperService {
  private baseUrl = environment.apiUrl;

  constructor(private http: HttpClient, private authService: AuthService) { }

  // ── Existing ────────────────────────────────────────────────────────────────
  changeUserName(name: string): Observable<any> {
    return this.http.patch(`${this.baseUrl}/developerSettings/changeusername`, { name });
  }

  // ── Get Profile (cache-gated) ────────────────────────────────────────────────
  // Returns the cached Developer instantly if already populated;
  // otherwise fetches from the API, seeds the cache, and emits the result.
  getProfile(forceRefresh = false): Observable<{ status: string; data: Developer }> {
    if (!forceRefresh) {
      const cached = this.authService.userProfileValue;
      if (cached) {
        return of({ status: 'cached', data: cached });
      }
    }
    return this.refreshProfile();
  }

  // ── Refresh Profile (network check) ──────────────────────────────────────────
  // Forces a network request to keep the in-memory cache and localStorage updated.
  refreshProfile(): Observable<{ status: string; data: Developer }> {
    return this.http.get<{ status: string; data: Developer }>(
      `${this.baseUrl}/developerSettings/profile`
    ).pipe(
      tap(res => {
        if (res?.data) {
          this.authService.updateProfileCache(res.data);
        }
      })
    );
  }

  // ── Update Settings ─────────────────────────────────────────────────────────
  // PUT /developerSettings/settings
  updateSettings(data: {
    name?: string;
    notifications?: { emailOnTaskComplete?: boolean; emailOnProjectUpdate?: boolean };
    preferences?: { theme?: string; language?: string };
  }): Observable<{ status: string; message: string; data: any }> {
    return this.http.put<{ status: string; message: string; data: any }>(
      `${this.baseUrl}/developerSettings/settings`,
      data
    ).pipe(
      tap(res => {
        if (res?.data) {
          this.authService.updateProfileCache(res.data);
        }
      })
    );
  }

  // ── Delete Account ──────────────────────────────────────────────────────────
  // DELETE /developerSettings/account
  deleteAccount(password: string): Observable<{ status: string; message: string }> {
    return this.http.delete<{ status: string; message: string }>(
      `${this.baseUrl}/developerSettings/account`,
      { body: { password } }
    );
  }
}
