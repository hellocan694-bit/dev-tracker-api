import {
  Component, OnInit, OnDestroy, ChangeDetectionStrategy, ChangeDetectorRef
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ToastService, Toast } from 'src/app/core/services/toast.service';
import { Subscription } from 'rxjs';

/**
 * ToastContainerComponent — Renders glassy toast notifications.
 * Add <app-toast-container> once in FeedbackLayoutComponent.
 */
@Component({
  selector: 'app-toast-container',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="toast-wrap" aria-live="polite" aria-atomic="false">
      <div
        *ngFor="let t of toasts; trackBy: trackById"
        class="toast"
        [class]="'toast--' + t.type"
        role="alert"
      >
        <span class="toast__icon">{{ icon(t.type) }}</span>
        <span class="toast__msg">{{ t.message }}</span>
        <button class="toast__close" (click)="toastSvc.dismiss(t.id)" aria-label="Close">✕</button>
      </div>
    </div>
  `,
  styles: [`
    .toast-wrap {
      position: fixed;
      top: 1.25rem;
      right: 1.25rem;
      z-index: 99999;
      display: flex;
      flex-direction: column;
      gap: 0.65rem;
      max-width: 380px;
      width: calc(100vw - 2.5rem);
      pointer-events: none;
    }
    .toast {
      pointer-events: all;
      display: flex;
      align-items: flex-start;
      gap: 0.65rem;
      padding: 0.9rem 1rem;
      border-radius: 12px;
      backdrop-filter: blur(24px);
      -webkit-backdrop-filter: blur(24px);
      border: 1px solid transparent;
      font-family: 'Inter', sans-serif;
      font-size: 0.875rem;
      font-weight: 500;
      color: #e2e8f0;
      box-shadow: 0 12px 40px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.05);
      animation: toastIn 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) both;
      &--success { background: rgba(16,185,129,0.1);  border-color: rgba(16,185,129,0.3);  }
      &--error   { background: rgba(239,68,68,0.1);   border-color: rgba(239,68,68,0.3);   }
      &--warning { background: rgba(245,158,11,0.1);  border-color: rgba(245,158,11,0.3);  }
      &--info    { background: rgba(99,102,241,0.1);  border-color: rgba(99,102,241,0.3);  }
    }
    .toast__icon { font-size: 1.05rem; flex-shrink: 0; margin-top: 0.05rem; }
    .toast__msg  { flex: 1; line-height: 1.45; }
    .toast__close {
      background: none; border: none; color: #64748b; cursor: pointer;
      font-size: 0.75rem; padding: 0.15rem 0.3rem; border-radius: 4px;
      flex-shrink: 0; transition: color 0.2s; line-height: 1;
      &:hover { color: #e2e8f0; }
    }
    @keyframes toastIn {
      from { opacity: 0; transform: translateX(120%) scale(0.9); }
      to   { opacity: 1; transform: translateX(0)   scale(1);   }
    }
  `]
})
export class ToastContainerComponent implements OnInit, OnDestroy {
  toasts: Toast[] = [];
  private sub!: Subscription;

  constructor(public toastSvc: ToastService, private cdr: ChangeDetectorRef) { }

  ngOnInit(): void {
    this.sub = this.toastSvc.toasts$.subscribe(t => {
      this.toasts = t;
      this.cdr.markForCheck();
    });
  }

  icon(type: Toast['type']): string {
    return { success: '✅', error: '❌', warning: '⚠️', info: 'ℹ️' }[type];
  }

  trackById(_: number, t: Toast) { return t.id; }
  ngOnDestroy(): void { this.sub?.unsubscribe(); }
}
