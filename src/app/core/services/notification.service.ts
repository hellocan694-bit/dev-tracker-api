import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable } from 'rxjs';
import { map, distinctUntilChanged } from 'rxjs/operators';
import { environment } from 'src/environment/environment';
import { AuthService } from './auth.service';

// ── Notification Types ────────────────────────────────────────────────────────

/**
 * Matches the backend enum exactly.
 * PERMISSIONS is displayed in the System/Team tab on the frontend.
 */
export type NotificationType = 'TASK_ASSIGNMENT' | 'SYSTEM' | 'PERMISSIONS';

export type NotificationTab = 'all' | 'task_assignments' | 'system_team';

export interface AppNotification {
  /** MongoDB _id from the backend (string after mapping). */
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  /** Extra event-specific fields surfaced from metadata */
  taskId?: string;
  taskTitle?: string;
  assignedByName?: string;
  assignedToUserId?: string;
  revokedProjectIds?: string[];
  adminName?: string;
  /** ISO date string converted to Date on mapping */
  timestamp: Date;
  read: boolean;
}

// ── Notification Service ──────────────────────────────────────────────────────

@Injectable({ providedIn: 'root' })
export class NotificationService {
  private readonly baseUrl = environment.apiUrl;

  /**
   * Set to true once the backend `/api/notifications` endpoint is deployed.
   * The route exists locally (and in Railway once deployed).
   */
  private readonly API_NOTIFICATIONS_ENABLED = true;

  private _currentUserId: string | null = null;

  // ── Primary cache — source of truth ──────────────────────────────────────
  private readonly _notifications$ = new BehaviorSubject<AppNotification[]>([]);

  /** Public read-only notification stream. */
  readonly notifications$: Observable<AppNotification[]> =
    this._notifications$.asObservable();

  /**
   * Reactive unread count — suitable for the Navbar badge.
   * Uses distinctUntilChanged so badge only re-renders when the count changes.
   */
  readonly unreadCount$: Observable<number> = this._notifications$.pipe(
    map((list) => list.filter((n) => !n.read).length),
    distinctUntilChanged()
  );

  /** Filtered stream for the "Task Assignments" tab. */
  readonly taskNotifications$: Observable<AppNotification[]> =
    this._notifications$.pipe(
      map((list) => list.filter((n) => n.type === 'TASK_ASSIGNMENT'))
    );

  /** Filtered stream for the "System / Team" tab (SYSTEM + PERMISSIONS). */
  readonly systemNotifications$: Observable<AppNotification[]> =
    this._notifications$.pipe(
      map((list) =>
        list.filter((n) => n.type === 'SYSTEM' || n.type === 'PERMISSIONS')
      )
    );

  // ── Active tab state ──────────────────────────────────────────────────────
  private readonly _activeTab$ = new BehaviorSubject<NotificationTab>('all');
  readonly activeTab$: Observable<NotificationTab> = this._activeTab$.asObservable();

  constructor(
    private http: HttpClient,
    private authService: AuthService
  ) {
    // Dynamically react to the currently logged in user to prevent account cross-contamination
    this.authService.currentUser$.subscribe((user) => {
      if (user && user._id) {
        this._currentUserId = user._id.toString();
        this.loadNotifications();
      } else {
        this._currentUserId = null;
        this._notifications$.next([]);
      }
    });
  }

  setActiveTab(tab: NotificationTab): void {
    this._activeTab$.next(tab);
  }

  // ── Filtered stream for the currently active tab ──────────────────────────
  readonly filteredNotifications$: Observable<AppNotification[]> =
    new Observable((observer) => {
      let lastTab: NotificationTab = 'all';
      let lastList: AppNotification[] = [];

      const emit = () => {
        observer.next(this._filterByTab(lastList, lastTab));
      };

      const tabSub = this._activeTab$.subscribe((tab) => {
        lastTab = tab;
        emit();
      });

      const listSub = this._notifications$.subscribe((list) => {
        lastList = list;
        emit();
      });

      return () => {
        tabSub.unsubscribe();
        listSub.unsubscribe();
      };
    });

  private _filterByTab(list: AppNotification[], tab: NotificationTab): AppNotification[] {
    if (tab === 'task_assignments') {
      return list.filter((n) => n.type === 'TASK_ASSIGNMENT');
    }
    if (tab === 'system_team') {
      return list.filter((n) => n.type === 'SYSTEM' || n.type === 'PERMISSIONS');
    }
    return list;
  }

  // ── Type mapping ──────────────────────────────────────────────────────────

  /**
   * Maps a raw backend `type` string into a canonical NotificationType.
   * The backend enum matches directly, but we normalise lowercase variants too
   * for resilience.
   */
  mapNotificationType(rawType: string): NotificationType {
    const t = (rawType || '').toUpperCase();
    if (t === 'TASK_ASSIGNMENT' || t === 'TASK_ASSIGNED') return 'TASK_ASSIGNMENT';
    if (t === 'PERMISSIONS') return 'PERMISSIONS';
    // SYSTEM, GENERAL, team events, access_revoked, invitation, etc. → SYSTEM
    return 'SYSTEM';
  }

  /**
   * Map a raw DB document (from HTTP response or socket payload) into AppNotification.
   */
  private _mapToAppNotification(item: any): AppNotification {
    const metadata = item.metadata || {};
    return {
      id: (item._id || item.id || `notif-${Date.now()}-${Math.random()}`).toString(),
      type: this.mapNotificationType(item.type),
      title: item.title || '',
      message: item.message || '',
      // Surface task-specific fields from metadata
      taskId:          metadata.taskId       || item.taskId,
      taskTitle:       metadata.taskTitle    || item.taskTitle,
      assignedByName:  metadata.assignedByName  || item.assignedByName,
      assignedToUserId: metadata.assignedToUserId || item.assignedToUserId,
      // Surface system-specific fields from metadata
      revokedProjectIds: metadata.revokedProjectIds || item.revokedProjectIds,
      adminName:         metadata.adminName  || item.adminName,
      timestamp: item.createdAt
        ? new Date(item.createdAt)
        : item.timestamp
          ? new Date(item.timestamp)
          : new Date(),
      read: !!(item.isRead ?? item.read),
    };
  }

  // ── DB hydration ──────────────────────────────────────────────────────────

  /**
   * HTTP GET /api/notifications — fetches all stored notifications and
   * replaces the BehaviorSubject cache. Called on service init and can be
   * called again to force a refresh.
   */
  loadNotifications(): void {
    if (!this.API_NOTIFICATIONS_ENABLED || !this._currentUserId) return;

    this.http.get<any>(`${this.baseUrl}/api/notifications`).subscribe({
      next: (res) => {
        let rawList: any[] = [];

        if (Array.isArray(res)) {
          rawList = res;
        } else if (res && Array.isArray(res.data)) {
          rawList = res.data;
        } else if (res && Array.isArray(res.notifications)) {
          rawList = res.notifications;
        } else if (res && typeof res === 'object') {
          const key = Object.keys(res).find((k) => Array.isArray(res[k]));
          if (key) rawList = res[key];
        }

        const mapped = rawList.map((item) => this._mapToAppNotification(item));
        this._notifications$.next(mapped);
      },
      error: (err) => {
        console.warn('[NotificationService] Failed to load notifications from DB:', err);
      },
    });
  }

  // ── Socket push (called by SocketService on `notification:received`) ──────

  /**
   * Accepts the raw DB document emitted by the backend socket event,
   * maps it, and prepends it to the cache — deduplicating by `_id`.
   *
   * This is the ONLY push path. All old pushTaskAssigned / pushGeneral /
   * pushAccessRevoked methods have been removed; the socket now always
   * delivers a full DB document with a stable _id.
   */
  pushFromSocket(rawPayload: any): void {
    const incoming = this._mapToAppNotification(rawPayload);
    const current  = this._notifications$.value.filter((n) => n.id !== incoming.id);
    this._notifications$.next([incoming, ...current]);
  }

  // ── Per-tab unread counts ─────────────────────────────────────────────────

  getUnreadCountForTab(tab: NotificationTab): Observable<number> {
    return this._notifications$.pipe(
      map((list) => {
        if (tab === 'task_assignments') {
          return list.filter((n) => !n.read && n.type === 'TASK_ASSIGNMENT').length;
        }
        if (tab === 'system_team') {
          return list.filter((n) => !n.read && (n.type === 'SYSTEM' || n.type === 'PERMISSIONS')).length;
        }
        return list.filter((n) => !n.read).length;
      }),
      distinctUntilChanged()
    );
  }

  // ── Read state management ─────────────────────────────────────────────────

  /**
   * Mark a notification as read locally AND persist to the backend.
   * Fire-and-forget on the HTTP call so the UI responds instantly.
   */
  markAsRead(id: string): void {
    // 1. Optimistic local update
    const updated = this._notifications$.value.map((n) =>
      n.id === id ? { ...n, read: true } : n
    );
    this._notifications$.next(updated);

    // 2. Persist to DB (fire-and-forget)
    if (this.API_NOTIFICATIONS_ENABLED) {
      this.http
        .patch(`${this.baseUrl}/api/notifications/${id}/read`, {})
        .subscribe({
          error: (err) =>
            console.warn(`[NotificationService] Failed to persist read state for ${id}:`, err),
        });
    }
  }

  markAllAsRead(): void {
    // Capture IDs that are currently unread BEFORE we mutate the cache.
    const unreadIds = this._notifications$.value
      .filter((n) => !n.read)
      .map((n) => n.id);

    const updated = this._notifications$.value.map((n) => ({ ...n, read: true }));
    this._notifications$.next(updated);

    // Persist only the ones that were actually unread.
    if (this.API_NOTIFICATIONS_ENABLED) {
      unreadIds.forEach((id) => {
        this.http
          .patch(`${this.baseUrl}/api/notifications/${id}/read`, {})
          .subscribe({ error: () => {} });
      });
    }
  }

  clearAll(): void {
    // 1. Optimistic UI update
    this._notifications$.next([]);

    // 2. Persist to DB via API
    if (this.API_NOTIFICATIONS_ENABLED) {
      this.http
        .delete(`${this.baseUrl}/api/notifications`)
        .subscribe({
          error: (err) =>
            console.warn('[NotificationService] Failed to clear notifications in DB:', err),
        });
    }
  }

  // ── Snapshot helpers ──────────────────────────────────────────────────────

  get unreadCount(): number {
    return this._notifications$.value.filter((n) => !n.read).length;
  }

  get snapshot(): AppNotification[] {
    return this._notifications$.value;
  }
}
