import { Component, OnInit, OnDestroy, ElementRef, ViewChild, AfterViewInit } from '@angular/core';
import { TeamsService } from 'src/app/core/services/teams.service';
import { SocketService } from 'src/app/core/services/socket.service';
import Swal from 'sweetalert2';
import { Subscription } from 'rxjs';
import gsap from 'gsap';

interface AdminProject {
  _id: string;
  name: string;
  status: string;
}

interface LimitError {
  message: string;
  currentCount: number;
  limit: number;
}

@Component({
  selector: 'app-teamleader',
  templateUrl: './teamleader.component.html',
  styleUrls: ['./teamleader.component.scss'],
})
export class TeamleaderComponent implements OnInit, OnDestroy, AfterViewInit {
  email        = '';
  members: any[] = [];
  isLoadingMembers = false;
  isSending        = false;

  // ── [3] Project Selector Modal state ───────────────────────────────────────
  showProjectModal   = false;
  adminProjects: AdminProject[] = [];
  selectedProjectIds = new Set<string>();
  isLoadingProjects  = false;

  // ── [4] Limit-Exceeded Alert Panel state ───────────────────────────────────
  limitError: LimitError | null = null;

  @ViewChild('limitPanel') limitPanelRef?: ElementRef<HTMLElement>;
  @ViewChild('projectModal') projectModalRef?: ElementRef<HTMLElement>;

  private subscriptions = new Subscription();
  private limitTl?: gsap.core.Timeline;

  constructor(
    private _teamsService: TeamsService,
    private _socketService: SocketService,
  ) {}

  ngOnInit(): void {
    this.loadTeamMembers();

    this.subscriptions.add(
      this._socketService.onEvent('invitation_accepted').subscribe({
        next: (data: any) => {
          this.loadTeamMembers();
          this.showToast('success', `${data.developerName} joined!`);
        },
      })
    );

    this.subscriptions.add(
      this._socketService.onEvent('removed_from_team').subscribe({
        next: () => this.loadTeamMembers(),
      })
    );
  }

  ngAfterViewInit(): void {}

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
    this.limitTl?.kill();
  }

  // ── [3] Project Selector Modal ─────────────────────────────────────────────

  openProjectModal(): void {
    if (!this.email) {
      this.showToast('error', 'Enter an email first');
      return;
    }
    this.showProjectModal   = true;
    this.isLoadingProjects  = true;
    this.selectedProjectIds = new Set<string>();

    this._teamsService.getAdminProjects().subscribe({
      next: (res: any) => {
        this.adminProjects     = res.data?.projects || [];
        this.isLoadingProjects = false;
        // Animate modal entrance
        setTimeout(() => {
          const el = this.projectModalRef?.nativeElement;
          if (el) {
            gsap.fromTo(el,
              { opacity: 0, scale: 0.92, y: 20 },
              { opacity: 1, scale: 1,    y: 0, duration: 0.35, ease: 'back.out(1.5)' }
            );
          }
        }, 0);
      },
      error: () => {
        this.isLoadingProjects = false;
        this.showToast('error', 'Could not load your projects');
      }
    });
  }

  closeProjectModal(): void {
    const el = this.projectModalRef?.nativeElement;
    if (el) {
      gsap.to(el, {
        opacity: 0, scale: 0.92, y: 10, duration: 0.2, ease: 'power2.in',
        onComplete: () => { this.showProjectModal = false; }
      });
    } else {
      this.showProjectModal = false;
    }
  }

  toggleProjectSelection(id: string): void {
    if (this.selectedProjectIds.has(id)) {
      this.selectedProjectIds.delete(id);
    } else {
      this.selectedProjectIds.add(id);
    }
  }

  isSelected(id: string): boolean {
    return this.selectedProjectIds.has(id);
  }

  // ── Send Invite (with or without selected projects) ────────────────────────

  onSendInvite(): void {
    if (!this.email) return;

    const sharedProjects = Array.from(this.selectedProjectIds);
    this.isSending = true;
    this.limitError = null;
    this.showProjectModal = false;

    const obs$ = sharedProjects.length > 0
      ? this._teamsService.sendInviteWithProjects(this.email, sharedProjects)
      : this._teamsService.sendInvite(this.email);

    obs$.subscribe({
      next: () => {
        this.showToast('success', 'Invitation Dispatched');
        this.email = '';
        this.selectedProjectIds.clear();
        this.isSending = false;
      },
      error: (err: any) => {
        this.isSending = false;
        const msg: string = err.error?.message || 'Check connection';

        // ── [4] Detect plan-limit error (HTTP 422) ──────────────────────────
        if (err.status === 422) {
          this.limitError = {
            message:      msg,
            currentCount: err.error?.currentCount ?? 0,
            limit:        err.error?.limit        ?? 3,
          };
          // GSAP entrance for the error panel
          setTimeout(() => {
            const panel = this.limitPanelRef?.nativeElement;
            if (panel) {
              this.limitTl?.kill();
              this.limitTl = gsap.timeline();
              this.limitTl
                .fromTo(panel,
                  { opacity: 0, y: -16, scale: 0.96 },
                  { opacity: 1, y:   0, scale: 1, duration: 0.4, ease: 'back.out(1.4)' }
                )
                .fromTo(panel.querySelectorAll('.limit-panel__row'),
                  { x: -10, opacity: 0 },
                  { x: 0,   opacity: 1, stagger: 0.07, duration: 0.25, ease: 'power2.out' },
                  '-=0.15'
                );
            }
          }, 0);
        } else {
          this.showAlertNotification('error', 'Transmission Failed', msg);
        }
      },
    });
  }

  dismissLimitError(): void {
    const panel = this.limitPanelRef?.nativeElement;
    if (panel) {
      gsap.to(panel, {
        opacity: 0, y: -10, duration: 0.2, ease: 'power2.in',
        onComplete: () => { this.limitError = null; }
      });
    } else {
      this.limitError = null;
    }
  }

  // ── Team Members ───────────────────────────────────────────────────────────

  loadTeamMembers(): void {
    this.isLoadingMembers = true;
    this._teamsService.getTeamMembers().subscribe({
      next: (res: any) => {
        this.members          = res.data?.members || [];
        this.isLoadingMembers = false;
      },
      error: () => { this.isLoadingMembers = false; }
    });
  }

  onRemoveMember(memberId: string, memberName: string): void {
    Swal.fire({
      title: 'Are you sure?',
      text: `You are about to remove ${memberName} from the team.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Yes, Remove!',
      cancelButtonText: 'Abort',
      background: 'rgba(15, 23, 42, 0.95)',
      color: '#fff',
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#3b82f6',
      customClass: { popup: 'glass-alert-popup' }
    }).then((result) => {
      if (result.isConfirmed) {
        this._teamsService.removeMember(memberId).subscribe({
          next: () => {
            this.showToast('success', `${memberName} has been removed.`);
            this.loadTeamMembers();
          },
          error: (err: any) => {
            this.showAlertNotification('error', 'Operation Failed', err.error?.message || 'Could not remove member');
          }
        });
      }
    });
  }

  onPermissionChange(memberId: string, key: string, event: any): void {
    const newValue   = event.target.checked;
    const member     = this.members.find(m => m.id === memberId);
    const memberName = member ? member.name : 'Developer';

    Swal.fire({
      title: 'Updating Permissions...',
      html: `Setting <b>${key}</b> to <b>${newValue}</b> for ${memberName}`,
      allowOutsideClick: false,
      didOpen: () => Swal.showLoading(),
      background: 'rgba(15, 23, 42, 0.95)',
      color: '#fff',
      customClass: { popup: 'glass-alert-popup' }
    });

    this._teamsService.updateMemberPermission(memberId, key, newValue).subscribe({
      next: () => {
        Swal.fire({
          icon: 'success', title: 'Permission Updated!',
          text: `${memberName} now has ${key} set to ${newValue}`,
          timer: 1500, showConfirmButton: false,
          background: 'rgba(15, 23, 42, 0.95)', color: '#fff',
          customClass: { popup: 'glass-alert-popup' }
        });
        if (member) { member.permissions[key] = newValue; }
      },
      error: (err: any) => {
        event.target.checked = !newValue;
        Swal.fire({
          icon: 'error', title: 'Update Failed',
          text: err.error?.message || 'Something went wrong',
          background: 'rgba(15, 23, 42, 0.95)', color: '#fff',
          confirmButtonColor: '#ef4444',
          customClass: { popup: 'glass-alert-popup' }
        });
      }
    });
  }

  // ── Helpers ────────────────────────────────────────────────────────────────

  private showToast(icon: 'success' | 'info' | 'warning' | 'error', title: string) {
    Swal.mixin({
      toast: true, position: 'bottom-end', showConfirmButton: false,
      timer: 4000, timerProgressBar: true,
      background: 'rgba(15, 23, 42, 0.9)', color: '#fff',
      didOpen: (toast) => {
        toast.style.backdropFilter = 'blur(10px)';
        toast.style.border         = '1px solid rgba(255, 255, 255, 0.1)';
        toast.style.borderRadius   = '12px';
      },
    }).fire({ icon, title });
  }

  private showAlertNotification(icon: 'warning' | 'error', title: string, text: string) {
    const alertColor = icon === 'warning' ? '#f59e0b' : '#ef4444';
    Swal.fire({
      title: `<span style="color: ${alertColor}; font-family: 'Plus Jakarta Sans', sans-serif; text-transform: uppercase; letter-spacing: 2px; font-weight:800;">${title}</span>`,
      html:  `<span style="color: #cbd5e1; font-size: 0.9rem;">${text}</span>`,
      icon, background: 'rgba(15, 23, 42, 0.95)',
      backdrop: `rgba(0,0,0,0.4)`, confirmButtonColor: '#3b82f6',
      customClass: { popup: 'glass-alert-popup' },
      didOpen: (popup) => {
        popup.style.backdropFilter = 'blur(15px)';
        popup.style.border         = `1px solid ${alertColor}44`;
        popup.style.borderRadius   = '24px';
      },
    });
  }
}
