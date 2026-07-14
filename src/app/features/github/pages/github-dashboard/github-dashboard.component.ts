import {
  Component, OnInit, OnDestroy, AfterViewInit, ViewChild, ElementRef, ChangeDetectorRef
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import gsap from 'gsap';
import Swal from 'sweetalert2';

import { GithubService } from 'src/app/core/services/github.service';
import { AuthService } from 'src/app/core/services/auth.service';
import {
  GitHubRepo, LinkedRepo, DeveloperActivity, TrialStatus, ProAccessError,
  FileEntry, LangBreakdownEntry, RepoContentsResponse
} from 'src/app/shared/interfaces/github';

// Language → colour map for dots
const LANG_COLORS: Record<string, string> = {
  TypeScript: '#3178c6', JavaScript: '#f7df1e', Python: '#3572A5',
  Java: '#b07219', 'C++': '#f34b7d', Go: '#00ADD8',
  Rust: '#dea584', HTML: '#e34c26', CSS: '#563d7c',
  SCSS: '#c6538c', Ruby: '#701516', PHP: '#4F5D95',
  Swift: '#F05138', Kotlin: '#A97BFF', Dart: '#00B4AB',
  Shell: '#89e051', Vue: '#41b883', default: '#6366f1'
};

@Component({
  selector: 'app-github-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './github-dashboard.component.html',
  styleUrls: ['./github-dashboard.component.scss']
})
export class GitHubDashboardComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('repoGrid', { static: false }) repoGrid!: ElementRef;

  // ── State ───────────────────────────────────────────────────────────────────────
  trialStatus: TrialStatus | null = null;
  repos: GitHubRepo[] = [];
  activity: DeveloperActivity[] = [];
  selectedRepos = new Set<number>();      // tracks selected repoIds
  savedRepos: LinkedRepo[] = [];

  // ── View mode ─────────────────────────────────────────────────────────────────
  viewMode: 'grid' | 'list' = 'grid';
  repoSearchQuery = '';

  // ── File Analytics Panel ───────────────────────────────────────────────────────
  expandedRepoId: number | null = null;
  expandedRepoData: RepoContentsResponse | null = null;
  isLoadingContents = false;
  contentsError = '';
  fileSearchQuery = '';

  isLoadingTrial = true;
  isLoadingRepos = true;
  isLoadingActivity = true;
  isSaving = false;
  saveSuccess = false;

  // Sync result from the backend after repo selection
  syncResult: { newProjectsCreated: number; totalLinked: number } | null = null;

  errorMessage = '';
  proAccessError: ProAccessError | null = null;

  // Skeleton placeholder array
  readonly skeletonItems = new Array(6);

  private subs: Subscription[] = [];
  private saveTimer?: ReturnType<typeof setTimeout>;

  constructor(
    private githubSvc: GithubService,
    private authSvc: AuthService,
    private router: Router,
    private cdr: ChangeDetectorRef,
    private sanitizer: DomSanitizer
  ) { }

  // ── Lifecycle ──────────────────────────────────────────────────────────────
  ngOnInit(): void {
    // Subscribe to the shared 403 error bus
    this.subs.push(
      this.githubSvc.proAccessError$.subscribe(err => {
        this.proAccessError = err;
        this.isLoadingRepos = false;
        this.cdr.detectChanges();
      })
    );

    this._loadTrialStatus();
  }

  ngAfterViewInit(): void { /* cards animate after repos load */ }

  ngOnDestroy(): void {
    this.subs.forEach(s => s.unsubscribe());
    if (this.saveTimer) clearTimeout(this.saveTimer);
  }

  // ── Data loading ───────────────────────────────────────────────────────────
  private _loadTrialStatus(): void {
    this.isLoadingTrial = true;
    this.githubSvc.getTrialStatus().subscribe({
      next: status => {
        this.trialStatus = status;
        this.isLoadingTrial = false;

        // Restore previously saved selection from backend
        if (status.linkedRepos && status.linkedRepos.length > 0) {
          status.linkedRepos.forEach(r => this.selectedRepos.add(r.repoId));
        }

        if (status.githubLinked) {
          this._loadRepos();
          this._loadActivity();
        } else {
          this.isLoadingRepos = false;
          this.isLoadingActivity = false;
        }
      },
      error: () => {
        this.isLoadingTrial = false;
        this.isLoadingRepos = false;
        this.isLoadingActivity = false;
        this.errorMessage = 'Failed to load GitHub status. Please try again.';
      }
    });
  }

  private _loadRepos(): void {
    this.isLoadingRepos = true;
    this.githubSvc.getRepos().subscribe({
      next: repos => {
        this.repos = repos;
        this.isLoadingRepos = false;
        // Animate cards in after DOM renders
        setTimeout(() => this._animateCards(), 60);
      },
      error: () => {
        this.isLoadingRepos = false;
      }
    });
  }

  private _loadActivity(): void {
    this.isLoadingActivity = true;
    this.githubSvc.getActivityFeed().subscribe({
      next: feed => {
        this.activity = feed;
        this.isLoadingActivity = false;
      },
      error: () => {
        this.isLoadingActivity = false;
      }
    });
  }

  // ── GSAP card entrance ─────────────────────────────────────────────────────
  private _animateCards(): void {
    if (!this.repoGrid?.nativeElement) return;
    const cards = this.repoGrid.nativeElement.querySelectorAll('.repo-card');
    if (!cards.length) return;
    gsap.fromTo(
      cards,
      { y: 30, opacity: 0, scale: 0.96 },
      { y: 0, opacity: 1, scale: 1, duration: 0.5, stagger: 0.06, ease: 'back.out(1.4)' }
    );
  }

  // ── Repo selection ─────────────────────────────────────────────────────────
  toggleRepo(repo: GitHubRepo): void {
    if (this.selectedRepos.has(repo.repoId)) {
      this.selectedRepos.delete(repo.repoId);
    } else {
      this.selectedRepos.add(repo.repoId);
    }
  }

  isSelected(repoId: number): boolean {
    return this.selectedRepos.has(repoId);
  }

  // ── Sync & Create Projects ─────────────────────────────────────────────────
  saveSelection(): void {
    if (this.isSaving || this.selectedRepos.size === 0) return;
    this.isSaving = true;
    this.saveSuccess = false;
    this.errorMessage = '';

    const payload: LinkedRepo[] = this.repos
      .filter(r => this.selectedRepos.has(r.repoId))
      .map(r => ({
        repoId: r.repoId,
        name: r.name,
        fullName: r.fullName,
        private: r.private,
        htmlUrl: r.htmlUrl,
        language: r.language
      }));

    this.githubSvc.selectRepos(payload).subscribe({
      next: (res: any) => {
        this.isSaving = false;
        this.saveSuccess = true;
        this.savedRepos = payload;

        // Capture sync summary from the new backend response
        this.syncResult = {
          newProjectsCreated: res?.newProjectsCreated ?? 0,
          totalLinked: res?.totalLinked ?? payload.length
        };

        // ── SweetAlert sync toast ───────────────────────────────────────────
        const created = this.syncResult.newProjectsCreated;
        Swal.mixin({
          toast: true,
          position: 'bottom-end',
          showConfirmButton: false,
          timer: 4000,
          timerProgressBar: true,
          background: 'rgba(15, 23, 42, 0.95)',
          color: '#fff',
          iconColor: '#10b981'
        }).fire({
          icon: 'success',
          title: 'Sync Complete! 🚀',
          html: created > 0
            ? `<span style="color:#94a3b8">${created} new project${created !== 1 ? 's' : ''} have been created for you.</span>`
            : `<span style="color:#94a3b8">${this.syncResult.totalLinked} repo${this.syncResult.totalLinked !== 1 ? 's' : ''} linked successfully.</span>`
        });

        // ── Navigate to projects after a short delay so user sees the toast ─
        this.saveTimer = setTimeout(() => {
          this.router.navigate(['home/activeprojects']);
        }, 1800);
      },
      error: (err: any) => {
        this.isSaving = false;
        this.errorMessage = err?.error?.message || 'Failed to sync repositories. Please try again.';

        Swal.mixin({
          toast: true,
          position: 'bottom-end',
          showConfirmButton: false,
          timer: 4000,
          background: 'rgba(15, 23, 42, 0.95)',
          color: '#fff'
        }).fire({
          icon: 'error',
          title: 'Sync Failed',
          html: `<span style="color:#94a3b8">${this.errorMessage}</span>`
        });
      }
    });
  }

  // ── Connect GitHub ─────────────────────────────────────────────────────────
  connectGitHub(): void {
    this.githubSvc.connectToGitHub();
  }

  // ── Helpers ──────────────────────────────────────────────────────────────────────
  langColor(lang: string | null): string {
    if (!lang) return LANG_COLORS['default'];
    return LANG_COLORS[lang] ?? LANG_COLORS['default'];
  }

  relativeTime(iso: string): string {
    const diff = Date.now() - new Date(iso).getTime();
    const m = Math.floor(diff / 60000);
    if (m < 1) return 'just now';
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ago`;
    return `${Math.floor(h / 24)}d ago`;
  }

  activityIcon(type: DeveloperActivity['type']): string {
    return type === 'push' ? '📦' : type === 'pull_request' ? '🔀' : '🐛';
  }

  goToPricing(): void {
    this.router.navigate(['/subscriptions/pricing']);
  }

  // ── View helpers ──────────────────────────────────────────────────────────────────
  setViewMode(mode: 'grid' | 'list'): void {
    this.viewMode = mode;
  }

  get filteredRepos(): GitHubRepo[] {
    const q = this.repoSearchQuery.trim().toLowerCase();
    if (!q) return this.repos;
    return this.repos.filter(r =>
      r.name.toLowerCase().includes(q) ||
      r.description?.toLowerCase().includes(q) ||
      r.language?.toLowerCase().includes(q)
    );
  }

  get filteredFiles(): FileEntry[] {
    if (!this.expandedRepoData) return [];
    const q = this.fileSearchQuery.trim().toLowerCase();
    if (!q) return this.expandedRepoData.files;
    return this.expandedRepoData.files.filter(f =>
      f.name.toLowerCase().includes(q) ||
      f.path.toLowerCase().includes(q) ||
      (f.language?.toLowerCase() ?? '').includes(q)
    );
  }

  // trackBy functions for performance ──────────────────────────────────────────
  trackByRepoId(_: number, repo: GitHubRepo): number { return repo.repoId; }
  trackByFilePath(_: number, file: FileEntry): string { return file.path; }
  trackByLang(_: number, entry: LangBreakdownEntry): string { return entry.language; }

  // File Analytics ───────────────────────────────────────────────────────────────────
  toggleRepoContents(repo: GitHubRepo): void {
    if (this.expandedRepoId === repo.repoId) {
      // Collapse
      this.expandedRepoId = null;
      this.expandedRepoData = null;
      this.fileSearchQuery = '';
      return;
    }

    this.expandedRepoId = repo.repoId;
    this.expandedRepoData = null;
    this.fileSearchQuery = '';
    this.isLoadingContents = true;
    this.contentsError = '';

    const [owner, repoName] = repo.fullName.split('/');
    this.githubSvc.getRepoContents(owner, repoName, repo.defaultBranch || 'HEAD').subscribe({
      next: (res) => {
        this.expandedRepoData = res;
        this.isLoadingContents = false;
        this.cdr.detectChanges();
        // GSAP staggered file row entrance
        setTimeout(() => {
          const rows = document.querySelectorAll('.file-row');
          if (rows.length) {
            gsap.fromTo(rows,
              { y: 10, opacity: 0 },
              { y: 0, opacity: 1, duration: 0.35, stagger: 0.025, ease: 'power2.out' }
            );
          }
        }, 60);
      },
      error: (err) => {
        this.isLoadingContents = false;
        this.contentsError = err?.error?.message || 'Failed to load file tree.';
        this.cdr.detectChanges();
      }
    });
  }

  isRepoExpanded(repoId: number): boolean {
    return this.expandedRepoId === repoId;
  }

  /**
   * Agent 3 — XSS guard: only text content is ever rendered (no innerHTML binding).
   * File paths and names are bound via Angular interpolation {{ }}, which auto-escapes.
   * This helper produces a safe CSS color for a language dot only (no HTML output).
   */
  langColorSafe(lang: string | null): string {
    return this.langColor(lang);
  }

  /** Maps extension to a readable emoji icon — purely presentational */
  fileIcon(ext: string): string {
    const map: Record<string, string> = {
      ts: '📘', tsx: '⚛️', js: '🟡', jsx: '⚛️',
      html: '🌐', css: '🎨', scss: '🎨', sass: '🎨',
      py: '🐍', java: '☕', go: '🟦', rs: '🪡',
      rb: '💎', php: '🐘', swift: '🟠', kt: '🟣',
      dart: '🟡', vue: '🟢', svelte: '🔶',
      json: '📝', yaml: '📝', yml: '📝', xml: '📝',
      md: '📄', sql: '🗃️', sh: '🖥️', bash: '🖥️',
      dockerfile: '🐳', tf: '🏗️',
    };
    return map[ext] ?? '📁';
  }

  formatBytes(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  }
}
