import {
  Component, Input, Output, EventEmitter, forwardRef, ChangeDetectionStrategy
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

/**
 * ⭐ StarRatingComponent — Standalone CVA-compatible star picker.
 * Usage with Reactive Forms: <app-star-rating formControlName="rating">
 */
@Component({
  selector: 'app-star-rating',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => StarRatingComponent),
      multi: true
    }
  ],
  template: `
    <div class="star-rating" [class.sr-disabled]="disabled" role="radiogroup" aria-label="Star rating">
      <button
        *ngFor="let s of stars"
        type="button"
        class="sr-star"
        [class.sr-filled]="s <= (hovered || value)"
        [class.sr-hovered]="hovered > 0 && s <= hovered"
        [attr.aria-label]="'Rate ' + s + ' out of 5'"
        [attr.aria-pressed]="s === value"
        [disabled]="disabled || null"
        (mouseenter)="!disabled && (hovered = s)"
        (mouseleave)="!disabled && (hovered = 0)"
        (click)="!disabled && select(s)"
      >★</button>
      <span class="sr-label" *ngIf="value > 0">{{ ratingLabels[value - 1] }}</span>
    </div>
  `,
  styles: [`
    .star-rating {
      display: inline-flex;
      align-items: center;
      gap: 0.05rem;
    }
    .sr-star {
      background: none;
      border: none;
      font-size: 2.25rem;
      color: rgba(255,255,255,0.12);
      cursor: pointer;
      padding: 0 0.15rem;
      line-height: 1;
      transition: color 0.15s, transform 0.18s cubic-bezier(0.34,1.56,0.64,1);
      outline: none;
    }
    .sr-star:hover:not(:disabled) { transform: scale(1.3); }
    .sr-star:disabled { cursor: not-allowed; opacity: 0.4; }
    .sr-filled { color: #f59e0b !important; }
    .sr-hovered { color: #fbbf24 !important; filter: drop-shadow(0 0 6px rgba(251,191,36,0.7)); }
    .sr-label {
      margin-left: 0.85rem;
      font-size: 0.82rem;
      font-weight: 600;
      color: #f59e0b;
      letter-spacing: 0.03em;
      animation: fadeIn .2s ease;
    }
    .sr-disabled .sr-star { cursor: not-allowed; }
    @keyframes fadeIn { from { opacity:0; transform:translateY(4px); } to { opacity:1; transform:none; } }
  `]
})
export class StarRatingComponent implements ControlValueAccessor {
  @Input() disabled = false;
  @Output() ratingChange = new EventEmitter<number>();

  value = 0;
  hovered = 0;
  stars = [1, 2, 3, 4, 5];
  ratingLabels = ['Poor', 'Fair', 'Good', 'Very Good', 'Excellent'];

  private _onChange: (v: number) => void = () => {};
  private _onTouched: () => void = () => {};

  select(star: number): void {
    this.value = star;
    this._onChange(star);
    this._onTouched();
    this.ratingChange.emit(star);
  }

  writeValue(v: number): void { this.value = v ?? 0; }
  registerOnChange(fn: (v: number) => void): void { this._onChange = fn; }
  registerOnTouched(fn: () => void): void { this._onTouched = fn; }
  setDisabledState(d: boolean): void { this.disabled = d; }
}
