import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from 'src/environment/environment';

@Injectable({
  providedIn: 'root'
})
export class DeveloperService {
  private baseUrl = environment.apiUrl;

  constructor(private http: HttpClient) { }

  // ── Existing ────────────────────────────────────────────────────────────────
  changeUserName(name: string): Observable<any> {
    return this.http.patch(`${this.baseUrl}/developerSettings/changeusername`, { name });
  }

  // ── Get Profile ─────────────────────────────────────────────────────────────
  // GET /developerSettings/profile
  getProfile(): Observable<{ status: string; data: any }> {
    return this.http.get<{ status: string; data: any }>(
      `${this.baseUrl}/developerSettings/profile`
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
