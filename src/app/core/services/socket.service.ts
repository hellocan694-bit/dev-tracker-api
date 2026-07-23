import { Injectable } from '@angular/core';
import { io, Socket } from 'socket.io-client';
import { Observable, Subject } from 'rxjs';
import Swal from 'sweetalert2';
import { Router } from '@angular/router';
import { environment } from '../../../environment/environment';
import { NotificationService } from './notification.service';
import { ProjectService } from './project.service';

@Injectable({ providedIn: 'root' })
export class SocketService {
  private socket: Socket | undefined;

  /**
   * Emits the revoked project IDs whenever `access:revoked` is received.
   * The ProjectService subscribes to this to perform cache cleanup.
   * Using a Subject (not BehaviorSubject) because there's no initial value.
   */
  readonly accessRevoked$ = new Subject<{
    developerId: string;
    revokedProjectIds: string[];
    adminName: string;
  }>();

  constructor(
    private notificationService: NotificationService,
    private projectService: ProjectService,
    private router: Router
  ) {}

  // ── Connection lifecycle ──────────────────────────────────────────────────

  connect(): void {
    if (this.socket?.connected) return;
    this.socket?.disconnect();

    this.socket = io(environment.socketUrl, {
      withCredentials: true,
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 2000,
    });

    this.socket.on('connect', () => {
      console.log('[Socket] Connected — ID:', this.socket?.id);
    });

    this.socket.on('connect_error', (err) => {
      console.error('[Socket] Connection error:', err.message);
    });

    this.socket.on('disconnect', (reason) => {
      console.warn('[Socket] Disconnected:', reason);
    });

    this._listenToEvents();
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = undefined;
    }
  }

  /** True when a socket connection is active. */
  get isConnected(): boolean {
    return this.socket?.connected ?? false;
  }

  // ── Event listeners ───────────────────────────────────────────────────────

  private _listenToEvents(): void {
    // ── 🔴 access:revoked — Project access revocation engine ─────────────────
    // Emitted by: POST /invitations/terminate/:memberId (backend terminateMember)
    // Payload: { developerId, revokedProjectIds[], adminName, message }
    this.socket?.on('access:revoked', (data: {
      developerId: string;
      revokedProjectIds: string[];
      adminName: string;
      message: string;
    }) => {
      console.warn('[Socket] access:revoked received', data);

      // 1. Filter revoked projects from the local BehaviorSubject cache instantly.
      //    No page refresh, no HTTP call — pure in-memory mutation.
      if (data.revokedProjectIds?.length > 0) {
        const current = this.projectService['_projects$'].getValue();
        if (current) {
          const filtered = current.filter(
            (p) => !data.revokedProjectIds.includes(p._id)
          );
          this.projectService['_projects$'].next(filtered);
        }
      }

      // 2. Card is delivered by notification:received (DB-backed).


      // 3. Re-emit on the public Subject so other components can react.
      this.accessRevoked$.next({
        developerId:       data.developerId,
        revokedProjectIds: data.revokedProjectIds ?? [],
        adminName:         data.adminName,
      });

      // 4. Show a high-visibility Swal toast.
      this._showToast('error', '🔴 Access Revoked', data.message, 6000);

      // 5. Redirect away if currently viewing one of the revoked projects.
      //    URL pattern: /home/projects/:id or /home/tasks/:projectId
      if (data.revokedProjectIds?.length > 0) {
        const currentUrl = this.router.url;
        const isOnRevokedProject = data.revokedProjectIds.some((id) =>
          currentUrl.includes(id)
        );
        if (isOnRevokedProject) {
          this.router.navigate(['/home']);
        }
      }
    });

    // ── Team events ───────────────────────────────────────────────────────────

    this.socket?.on('new_invitation', (data: any) => {
      // Card is delivered by notification:received (DB-backed).
      // Only show the toast here.
      this._showToast('info', 'New Invitation', data.message);
    });

    this.socket?.on('invitation_accepted', (data: any) => {
      // Card delivered by notification:received.
      this._showToast('success', 'Team Update', data.message);
    });

    this.socket?.on('invitation_rejected', (data: any) => {
      // Card delivered by notification:received.
      this._showToast('warning', 'Team Update', data.message);
    });

    this.socket?.on('removed_from_team', (data: any) => {
      // Card delivered by notification:received.
      this._showToast('error', 'Removed From Team', data.message);
    });

    this.socket?.on('permissions_updated', (data: any) => {
      // Card delivered by notification:received.
      this._showToast('info', 'Permissions Updated', data.message);
    });

    // ── Task events ───────────────────────────────────────────────────────────

    // ── Unified notification channel ─────────────────────────────────────────
    // The backend now always emits a full DB document (with _id, type, metadata)
    // via this event after persisting to MongoDB.  We push it into the service
    // cache (with deduplication) and show a toast based on the notification type.
    this.socket?.on('notification:received', (data: any) => {
      // Prepend to BehaviorSubject cache (deduplicates by _id)
      this.notificationService.pushFromSocket(data);

      // Toast message
      const title   = data.title   || 'Notification';
      const message = data.message || '';
      const type    = (data.type   || '').toUpperCase();

      if (type === 'TASK_ASSIGNMENT') {
        this._showToast('info', title, message);
      } else if (type === 'PERMISSIONS') {
        this._showToast('info', title, message);
      } else {
        this._showToast('info', title, message);
      }
    });
  }

  // ── Generic observable listener ───────────────────────────────────────────

  /**
   * Returns an Observable that wraps any socket event.
   * Auto-removes the handler on unsubscribe — no listener accumulation.
   */
  onEvent<T = any>(eventName: string): Observable<T> {
    return new Observable<T>((observer) => {
      const handler = (data: T) => observer.next(data);
      this.socket?.on(eventName, handler);
      return () => {
        this.socket?.off(eventName, handler);
      };
    });
  }

  /** Emit a socket event from the client side. */
  emit(eventName: string, payload: any): void {
    if (!this.socket?.connected) {
      console.warn(`[Socket] Cannot emit "${eventName}" — not connected`);
      return;
    }
    this.socket.emit(eventName, payload);
  }

  // ── Internal toast helper ─────────────────────────────────────────────────

  private _showToast(
    icon: 'info' | 'success' | 'warning' | 'error',
    title: string,
    text: string,
    timer = 4000
  ): void {
    Swal.fire({
      toast: true,
      position: 'bottom-end',
      showConfirmButton: false,
      timer,
      timerProgressBar: true,
      icon,
      title,
      text,
      background: 'rgba(10, 11, 13, 0.96)',
      color: '#e2e8f0',
      didOpen: (toast) => {
        toast.style.backdropFilter = 'blur(12px)';
        toast.style.borderRadius   = '12px';
        toast.style.border         = '1px solid #1c1f26';
        toast.style.marginBottom   = '20px';
        toast.style.boxShadow      = '0 8px 32px rgba(0,0,0,0.4)';
      },
    });
  }
}