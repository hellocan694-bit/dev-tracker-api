import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subject } from 'rxjs';
import { takeUntil, finalize } from 'rxjs/operators';

import { TeamsService } from 'src/app/core/services/teams.service';
import { Team, TeamMember } from 'src/app/shared/interfaces/team';

@Component({
  selector: 'app-my-teams',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './my-teams.component.html',
  styleUrls: ['./my-teams.component.scss'],
})
export class MyTeamsComponent implements OnInit, OnDestroy {
  /** Teams the user owns. */
  ownedTeams: Team[] = [];

  /** Teams the user is a member of (but not owner). */
  memberTeams: Team[] = [];

  isLoading = true;
  errorMessage = '';

  /** Tracks which team card's member list is expanded. */
  expandedTeamId: string | null = null;

  private destroy$ = new Subject<void>();

  constructor(private teamsService: TeamsService) { }

  ngOnInit(): void {
    this.loadMyTeams();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ── Data Loading ───────────────────────────────────────────────────────────

  loadMyTeams(): void {
    this.isLoading = true;
    this.errorMessage = '';

    this.teamsService
      .getMyTeams()
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => (this.isLoading = false))
      )
      .subscribe({
        next: (res) => {
          this.ownedTeams = res.data.ownedTeams;
          this.memberTeams = res.data.memberTeams;
        },
        error: (err) => {
          this.errorMessage =
            err?.error?.message || 'Failed to load your teams. Please try again.';
        },
      });
  }

  // ── UI Helpers ─────────────────────────────────────────────────────────────

  /**
   * trackBy for the team lists — prevents full DOM re-render
   * when only data changes (e.g. after a refresh).
   */
  trackByTeamId(_index: number, team: Team): string {
    return team._id;
  }

  /**
   * trackBy for the members list inside each team card.
   */
  trackByMemberId(_index: number, member: TeamMember): string {
    return member._id;
  }

  /** Returns the first letter of a name for avatar initials. */
  getInitial(name: string): string {
    return name?.charAt(0)?.toUpperCase() ?? '?';
  }

  /** Returns a deterministic hue (0-360) from a string for avatar colours. */
  getAvatarHue(id: string): number {
    let hash = 0;
    for (let i = 0; i < id.length; i++) {
      hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
    }
    return hash % 360;
  }

  /** Toggle the expanded member list for a team card. */
  toggleExpand(teamId: string): void {
    this.expandedTeamId = this.expandedTeamId === teamId ? null : teamId;
  }

  get totalTeams(): number {
    return this.ownedTeams.length + this.memberTeams.length;
  }
}
