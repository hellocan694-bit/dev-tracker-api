import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from 'src/environment/environment';
import { MyTeamsResponse } from 'src/app/shared/interfaces/team';

@Injectable({
  providedIn: 'root'
})
export class TeamsService {
  private baseUrl    = `${environment.apiUrl}/invitations`;
  private teamsUrl   = `${environment.apiUrl}/api/teams`;

  constructor(private http: HttpClient) { }

  // ── My Teams (new endpoint) ───────────────────────────────────────────────

  /**
   * GET /api/teams/my-teams
   * Returns all teams where the authenticated user is owner OR member,
   * pre-split into ownedTeams / memberTeams by the server.
   */
  getMyTeams(): Observable<MyTeamsResponse> {
    return this.http.get<MyTeamsResponse>(`${this.teamsUrl}/my-teams`);
  }

  /**
   * POST /api/teams
   * Create a new team — the calling user becomes the owner.
   */
  createTeam(payload: { name: string; description?: string; category?: string }): Observable<any> {
    return this.http.post(`${this.teamsUrl}`, payload);
  }

  // ── Invitations (existing) ────────────────────────────────────────────────

  sendInvite(email: string): Observable<any> {
    return this.http.post(`${this.baseUrl}/sendinvitaions`, { email });
  }

  getMyInvitations(): Observable<any> {
    return this.http.get(`${this.baseUrl}/getallinetations`);
  }

  respondToInvitation(invitationId: string, decision: 'accept' | 'reject'): Observable<any> {
    return this.http.post(`${this.baseUrl}/respond/${invitationId}`, { decision });
  }

  getTeamMembers(): Observable<any> {
    return this.http.get(`${this.baseUrl}/members`);
  }

  removeMember(memberId: string): Observable<any> {
    return this.http.delete(`${this.baseUrl}/members/${memberId}`);
  }

  updateMemberPermission(memberId: string, key: string, value: boolean): Observable<any> {
    return this.http.patch(`${this.baseUrl}/members/${memberId}/permissions`, { key, value });
  }
}