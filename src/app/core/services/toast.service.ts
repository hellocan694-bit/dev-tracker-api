import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export interface Toast {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
}

/**
 * ToastService — Glassy in-theme toast system.
 * Drop-in replacement for ngx-toastr in the Feedback/GitHub modules.
 */
@Injectable({ providedIn: 'root' })
export class ToastService {
  private _toasts$ = new BehaviorSubject<Toast[]>([]);
  readonly toasts$ = this._toasts$.asObservable();

  private push(type: Toast['type'], message: string, duration: number): void {
    const id = `t-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    this._toasts$.next([...this._toasts$.getValue(), { id, type, message }]);
    setTimeout(() => this.dismiss(id), duration);
  }

  success(message: string, duration = 4000)  { this.push('success', message, duration); }
  error(message: string,   duration = 6000)  { this.push('error',   message, duration); }
  warning(message: string, duration = 5000)  { this.push('warning', message, duration); }
  info(message: string,    duration = 4000)  { this.push('info',    message, duration); }

  dismiss(id: string): void {
    this._toasts$.next(this._toasts$.getValue().filter(t => t.id !== id));
  }
}
