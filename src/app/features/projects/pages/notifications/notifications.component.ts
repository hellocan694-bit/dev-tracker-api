import {
  Component, OnInit, OnDestroy, ChangeDetectionStrategy, ChangeDetectorRef
} from '@angular/core';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import {
  NotificationService,
  AppNotification,
  NotificationTab
} from 'src/app/core/services/notification.service';

@Component({
  selector: 'app-notifications',
  standalone: false,
  templateUrl: './notifications.component.html',
  styleUrls: ['./notifications.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class NotificationsComponent implements OnInit, OnDestroy {

  // ── Tab definitions ────────────────────────────────────────────────────────
  readonly tabs: { label: string; value: NotificationTab; icon: string }[] = [
    { label: 'All', value: 'all', icon: 'bi-bell-fill' },
    { label: 'Task Assignments', value: 'task_assignments', icon: 'bi-check2-square' },
    { label: 'System / Team', value: 'system_team', icon: 'bi-shield-fill-check' },
  ];

  // ── View state ─────────────────────────────────────────────────────────────
  activeTab: NotificationTab = 'all';
  notifications: AppNotification[] = [];
  unreadCount = 0;
  isAnimating = false;

  tabUnreadCounts: Record<NotificationTab, number> = {
    all: 0,
    task_assignments: 0,
    system_team: 0,
  };

  private readonly destroy$ = new Subject<void>();

  constructor(
    public notificationService: NotificationService,
    private cdr: ChangeDetectorRef
  ) { }

  ngOnInit(): void {
    // ── Subscribe to the filtered notification stream ──────────────────────
    this.notificationService.filteredNotifications$
      .pipe(takeUntil(this.destroy$))
      .subscribe((list) => {
        this.notifications = list;
        this.cdr.markForCheck();
      });

    // ── Subscribe to source notifications to calculate unread counts for each tab ──
    this.notificationService.notifications$
      .pipe(takeUntil(this.destroy$))
      .subscribe((list) => {
        this.tabUnreadCounts = {
          all:              list.filter((n) => !n.read).length,
          task_assignments: list.filter((n) => !n.read && n.type === 'TASK_ASSIGNMENT').length,
          system_team:      list.filter((n) => !n.read && (n.type === 'SYSTEM' || n.type === 'PERMISSIONS')).length,
        };
        this.unreadCount = this.tabUnreadCounts.all;
        this.cdr.markForCheck();
      });

    // ── Sync active tab from service ─────────────────────────────────────
    this.notificationService.activeTab$
      .pipe(takeUntil(this.destroy$))
      .subscribe((tab) => {
        this.activeTab = tab;
        this.cdr.markForCheck();
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ── Tab control ────────────────────────────────────────────────────────────

  setTab(tab: NotificationTab): void {
    if (this.activeTab === tab) return;
    this.notificationService.setActiveTab(tab);
    this.activeTab = tab;
    this.cdr.markForCheck();
  }

  // ── Read state actions ─────────────────────────────────────────────────────

  markRead(id: string, event: Event): void {
    event.stopPropagation();
    this.notificationService.markAsRead(id);
  }

  markAllRead(): void {
    this.notificationService.markAllAsRead();
  }

  clearAll(): void {
    this.notificationService.clearAll();
  }

  // ── Type metadata helpers ──────────────────────────────────────────────────

  iconFor(n: AppNotification): string {
    if (n.type === 'TASK_ASSIGNMENT') return 'bi-check2-square';
    if (n.type === 'PERMISSIONS') return 'bi-shield-lock-fill';
    if (n.type === 'SYSTEM') {
      const lowerTitle = (n.title || '').toLowerCase();
      if (lowerTitle.includes('invite') || lowerTitle.includes('invitation')) return 'bi-person-plus-fill';
      if (lowerTitle.includes('revoked') || lowerTitle.includes('revoke')) return 'bi-shield-exclamation';
      return 'bi-people-fill';
    }
    return 'bi-bell-fill';
  }

  accentFor(n: AppNotification): string {
    if (n.type === 'TASK_ASSIGNMENT') return 'accent--indigo';
    if (n.type === 'PERMISSIONS') return 'accent--amber';
    if (n.type === 'SYSTEM') {
      const lowerTitle = (n.title || '').toLowerCase();
      if (lowerTitle.includes('invite') || lowerTitle.includes('invitation')) return 'accent--green';
      if (lowerTitle.includes('revoked') || lowerTitle.includes('revoke')) return 'accent--red';
      return 'accent--amber';
    }
    return 'accent--slate';
  }

  typeLabelFor(n: AppNotification): string {
    if (n.type === 'TASK_ASSIGNMENT') return 'Task Assigned';
    if (n.type === 'PERMISSIONS') return 'Permissions';
    if (n.type === 'SYSTEM') {
      const lowerTitle = (n.title || '').toLowerCase();
      if (lowerTitle.includes('invite') || lowerTitle.includes('invitation')) return 'Invitation';
      if (lowerTitle.includes('revoked') || lowerTitle.includes('revoke')) return 'Access Revoked';
      return 'Team Update';
    }
    return 'System';
  }

  // ── Time formatting ────────────────────────────────────────────────────────

  relativeTime(date: Date): string {
    const diff = (Date.now() - new Date(date).getTime()) / 1000;
    if (diff < 60) return 'Just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  }

  // ── ngFor track ───────────────────────────────────────────────────────────

  trackById(_: number, n: AppNotification): string { return n.id; }
}
