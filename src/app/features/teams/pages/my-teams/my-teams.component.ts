import {
  Component, OnInit, OnDestroy, AfterViewInit,
  ViewChild, ElementRef, ChangeDetectorRef
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subject } from 'rxjs';
import { takeUntil, finalize } from 'rxjs/operators';
import { gsap } from 'gsap';

import { TeamsService }  from 'src/app/core/services/teams.service';
import { ProjectService } from 'src/app/core/services/project.service';
import { Team, TeamMember } from 'src/app/shared/interfaces/team';
import { Project } from 'src/app/shared/interfaces/project';

@Component({
  selector: 'app-my-teams',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './my-teams.component.html',
  styleUrls: ['./my-teams.component.scss'],
})
export class MyTeamsComponent implements OnInit, AfterViewInit, OnDestroy {

  // ── Team Data ───────────────────────────────────────────────────────────────
  ownedTeams:  Team[] = [];
  memberTeams: Team[] = [];

  isLoading    = true;
  errorMessage = '';

  /** Tracks which team card's member list is expanded. */
  expandedTeamId: string | null = null;

  // ── Assign-Project Modal ────────────────────────────────────────────────────
  showAssignModal    = false;
  assignTargetMember: TeamMember | null = null;
  allProjects:       Project[]  = [];
  selectedProjectIds = new Set<string>();
  isLoadingProjects  = false;
  isAssigning        = false;
  assignError        = '';

  @ViewChild('assignModalBox') assignModalBoxRef!: ElementRef<HTMLElement>;

  private destroy$ = new Subject<void>();

  constructor(
    private teamsService:   TeamsService,
    private projectService: ProjectService,
    private cdr:            ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadMyTeams();
  }

  ngAfterViewInit(): void {}

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ── Data Loading ────────────────────────────────────────────────────────────

  loadMyTeams(): void {
    this.isLoading    = true;
    this.errorMessage = '';

    this.teamsService
      .getMyTeams()
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => (this.isLoading = false))
      )
      .subscribe({
        next: (res) => {
          this.ownedTeams  = res.data.ownedTeams;
          this.memberTeams = res.data.memberTeams;
          this.animateCards();
        },
        error: (err) => {
          this.errorMessage =
            err?.error?.message || 'Failed to load your teams. Please try again.';
        },
      });
  }

  private animateCards(): void {
    setTimeout(() => {
      const sections = document.querySelectorAll('.teams-section');
      const cards    = document.querySelectorAll('.team-card');
      if (sections.length > 0) {
        gsap.fromTo(sections,
          { opacity: 0, y: 30 },
          { opacity: 1, y: 0, duration: 0.6, stagger: 0.15, ease: 'power2.out' }
        );
      }
      if (cards.length > 0) {
        gsap.fromTo(cards,
          { opacity: 0, y: 40, scale: 0.96 },
          { opacity: 1, y: 0, scale: 1, duration: 0.7, stagger: 0.08, ease: 'power2.out' }
        );
      }
    }, 150);
  }

  // ── Assign-Project Modal ────────────────────────────────────────────────────

  /** Opens the assign-project modal for a specific team member. */
  openAssignModal(member: TeamMember): void {
    this.assignTargetMember = member;
    this.selectedProjectIds = new Set<string>();
    
    // Pre-populate with currently assigned projects
    if (member.sharedProjects) {
      member.sharedProjects.forEach((id: any) => {
        const idStr = typeof id === 'string' ? id : id?._id;
        if (idStr) this.selectedProjectIds.add(idStr);
      });
    }

    this.assignError        = '';
    this.isLoadingProjects  = true;
    this.showAssignModal    = true;
    this.cdr.detectChanges();

    // Animate the modal box in
    const el = this.assignModalBoxRef?.nativeElement;
    if (el) {
      gsap.fromTo(el,
        { opacity: 0, scale: 0.95, y: 16 },
        { opacity: 1, scale: 1,    y: 0,  duration: 0.25, ease: 'back.out(1.4)' }
      );
    }

    // Load projects from cache (zero-cost if already populated)
    this.projectService.getAllProjects(1, 100).pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: (res) => {
        this.allProjects       = Array.isArray(res.Projects) ? res.Projects : [];
        this.isLoadingProjects = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.isLoadingProjects = false;
        this.assignError       = 'Could not load projects. Please try again.';
        this.cdr.detectChanges();
      }
    });
  }

  closeAssignModal(): void {
    const el = this.assignModalBoxRef?.nativeElement;
    if (el) {
      gsap.to(el, {
        opacity: 0, scale: 0.95, y: 10, duration: 0.18, ease: 'power2.in',
        onComplete: () => {
          this.showAssignModal    = false;
          this.assignTargetMember = null;
          this.cdr.detectChanges();
        }
      });
    } else {
      this.showAssignModal    = false;
      this.assignTargetMember = null;
    }
  }

  toggleProjectForAssignment(projectId: string): void {
    if (this.selectedProjectIds.has(projectId)) {
      this.selectedProjectIds.delete(projectId);
    } else {
      this.selectedProjectIds.add(projectId);
    }
  }

  isProjectSelected(projectId: string): boolean {
    return this.selectedProjectIds.has(projectId);
  }

  submitAssignment(): void {
    if (!this.assignTargetMember || this.selectedProjectIds.size === 0) return;

    this.isAssigning = true;
    this.assignError = '';
    const projectIds = Array.from(this.selectedProjectIds);

    this.teamsService
      .assignProjectsToMember(this.assignTargetMember._id, projectIds)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.isAssigning = false;
          // Sync local team lists from the updated BehaviorSubject
          const cached = this.teamsService['_teams$'].getValue();
          if (cached) {
            this.ownedTeams  = cached.data.ownedTeams;
            this.memberTeams = cached.data.memberTeams;
          }
          this.closeAssignModal();
        },
        error: (err) => {
          this.isAssigning = false;
          this.assignError = err?.error?.message || 'Assignment failed. Please try again.';
          this.cdr.detectChanges();
        }
      });
  }

  // ── UI Helpers ──────────────────────────────────────────────────────────────

  trackByTeamId(_index: number, team: Team): string    { return team._id; }
  trackByMemberId(_index: number, m: TeamMember): string { return m._id; }
  trackByProjectId(_index: number, p: Project): string { return p._id; }

  getInitial(name: string): string {
    return name?.charAt(0)?.toUpperCase() ?? '?';
  }

  getAvatarHue(id: string): number {
    let hash = 0;
    for (let i = 0; i < id.length; i++) {
      hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
    }
    return hash % 360;
  }

  toggleExpand(teamId: string): void {
    this.expandedTeamId = this.expandedTeamId === teamId ? null : teamId;
  }

  get totalTeams(): number {
    return this.ownedTeams.length + this.memberTeams.length;
  }
}
