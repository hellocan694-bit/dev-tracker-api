import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { map, tap } from 'rxjs/operators';
import { environment } from 'src/environment/environment';
import { MyTeamsResponse, Team, TeamMember } from 'src/app/shared/interfaces/team';

@Injectable({
  providedIn: 'root'
})
export class TeamsService {
  private baseUrl    = `${environment.apiUrl}/invitations`;
  private teamsUrl   = `${environment.apiUrl}/api/teams`;

  constructor(private http: HttpClient) { }

  // ── Cache Layer ────────────────────────────────────────────────────────────
  private readonly _teams$ = new BehaviorSubject<MyTeamsResponse | null>(null);

  /** Read-only stream. Components subscribe; the service pushes updates. */
  readonly teams$ = this._teams$.asObservable();

  get isCacheLoaded(): boolean {
    return this._teams$.getValue() !== null;
  }

  /**
   * Smart cache-gate: returns the cached team data if available,
   * otherwise fires the HTTP GET and populates the cache.
   */
  loadMyTeams(forceRefresh = false): Observable<MyTeamsResponse> {
    return this.getMyTeams(forceRefresh);
  }

  /** Invalidate cache — forces a fresh fetch on the next loadMyTeams() call. */
  invalidateCache(): void {
    this._teams$.next(null);
  }

  // ── My Teams (HTTP) ────────────────────────────────────────────────────────

  /**
   * GET /api/teams/my-teams
   * Returns all teams where the authenticated user is owner OR member,
   * pre-split into ownedTeams / memberTeams by the server.
   */
  getMyTeams(forceRefresh = false): Observable<MyTeamsResponse> {
    if (!forceRefresh && this.isCacheLoaded) {
      return of(this._teams$.getValue()!);
    }
    return this.http.get<MyTeamsResponse>(`${this.teamsUrl}/my-teams`).pipe(
      tap((res) => this._teams$.next(res))
    );
  }

  /**
   * POST /api/teams
   * Create a new team — the calling user becomes the owner.
   * Invalidates the cache so the next loadMyTeams() fetches fresh data.
   */
  createTeam(payload: { name: string; description?: string; category?: string }): Observable<any> {
    return this.http.post(`${this.teamsUrl}`, payload).pipe(
      tap(() => this.invalidateCache())
    );
  }

  // ── Invitations (existing + new project-aware) ────────────────────────────

  /** Legacy: team-only invite (no project sharing) */
  sendInvite(email: string): Observable<any> {
    return this.http.post(`${this.baseUrl}/sendinvitaions`, { email });
  }

  /**
   * Agent 3 — sends an invite with an explicit list of shared project IDs.
   * The backend validates ownership server-side (IDOR guard).
   */
  sendInviteWithProjects(email: string, sharedProjects: string[]): Observable<any> {
    return this.http.post(`${this.baseUrl}/sendinvitaions`, { email, sharedProjects });
  }

  /**
   * Agent 3 — fetches only this admin's own projects (for the selector modal).
   * Returns { data: { projects: [{ _id, name, status }] } }
   */
  getAdminProjects(): Observable<any> {
    return this.http.get(`${this.baseUrl}/my-projects`);
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

  /**
   * DELETE /invitations/members/:id
   * Removes member from both ownedTeams and memberTeams in the cache instantly.
   */
  removeMember(memberId: string): Observable<any> {
    return this.http.delete(`${this.baseUrl}/members/${memberId}`).pipe(
      tap(() => {
        const current = this._teams$.getValue();
        if (!current) return;
        const filterMember = (teams: Team[]) =>
          teams.map((t) => ({
            ...t,
            members: t.members.filter((m) => m._id !== memberId),
          }));
        this._teams$.next({
          ...current,
          data: {
            ownedTeams: filterMember(current.data.ownedTeams),
            memberTeams: filterMember(current.data.memberTeams),
          },
        });
      })
    );
  }

  /**
   * POST /invitations/terminate/:memberId
   *
   * Full revocation endpoint — removes the member AND triggers `access:revoked`
   * socket emission from the server with their `revokedProjectIds`.
   *
   * Client-side: removes the member from the local team cache optimistically
   * so the UI updates without waiting for the server's socket event.
   */
  terminateMember(memberId: string): Observable<{ revokedProjectIds: string[] }> {
    return this.http
      .post<{ status: string; message: string; data: { revokedProjectIds: string[] } }>(
        `${this.baseUrl}/terminate/${memberId}`,
        {}
      )
      .pipe(
        tap(() => {
          // Optimistic cache removal — same pattern as removeMember
          const current = this._teams$.getValue();
          if (!current) return;
          const filterMember = (teams: Team[]) =>
            teams.map((t) => ({
              ...t,
              members: t.members.filter((m) => m._id !== memberId),
            }));
          this._teams$.next({
            ...current,
            data: {
              ownedTeams:  filterMember(current.data.ownedTeams),
              memberTeams: filterMember(current.data.memberTeams),
            },
          });
        }),
        map((res) => ({ revokedProjectIds: res.data?.revokedProjectIds ?? [] }))
      );
  }

  /**
   * PATCH /invitations/members/:id/permissions
   * Permission shape is server-authoritative — invalidate so next
   * loadMyTeams() fetches the authoritative state.
   */
  updateMemberPermission(memberId: string, key: string, value: boolean): Observable<any> {
    return this.http
      .patch(`${this.baseUrl}/members/${memberId}/permissions`, { key, value })
      .pipe(tap(() => this.invalidateCache()));
  }

  /**
   * PATCH /invitations/members/:id/assign-projects
   * Assigns (or replaces) the set of shared projects for a specific member.
   * On success, updates the in-memory cache immediately so the UI reflects
   * the new assignment without a page reload or network refetch.
   */
  assignProjectsToMember(memberId: string, projectIds: string[]): Observable<any> {
    return this.http
      .patch(`${this.baseUrl}/members/${memberId}/assign-projects`, { projectIds })
      .pipe(
        tap((res: any) => {
          const current = this._teams$.getValue();
          if (!current) return;
          // The server echoes back the updated member; fall back to local projectIds
          const updatedProjects: string[] = res?.data?.sharedProjects ?? projectIds;
          const patchMember = (members: TeamMember[]) =>
            members.map((m) =>
              m._id === memberId
                ? { ...m, sharedProjects: updatedProjects }
                : m
            );
          this._teams$.next({
            ...current,
            data: {
              ownedTeams:  current.data.ownedTeams.map((t) => ({ ...t, members: patchMember(t.members) })),
              memberTeams: current.data.memberTeams.map((t) => ({ ...t, members: patchMember(t.members) })),
            },
          });
        })
      );
  }
}