import {
  Component,
  OnInit,
  OnDestroy,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  NgZone,
  AfterViewInit
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import { FeatureTourService, TourState } from 'src/app/core/services/feature-tour.service';

@Component({
  selector: 'app-feature-tour',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './feature-tour.component.html',
  styleUrls: ['./feature-tour.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class FeatureTourComponent implements OnInit, OnDestroy, AfterViewInit {

  state: TourState | null = null;

  // Tooltip positioning state
  tooltipStyle: { [key: string]: string } = {};
  highlightStyle: { [key: string]: string } = {};
  arrowDirection: 'top' | 'bottom' | 'left' | 'right' | 'none' = 'bottom';

  private sub?: Subscription;
  private resizeObserver?: ResizeObserver;

  constructor(
    private tourService: FeatureTourService,
    private cdr: ChangeDetectorRef,
    private ngZone: NgZone
  ) { }

  ngOnInit(): void {
    this.sub = this.tourService.state$.subscribe(state => {
      this.state = state;
      if (state.active && state.currentStep) {
        // Give Angular a tick to render before positioning
        setTimeout(() => this.positionTooltip(state.currentStep!.targetId, state.currentStep!.position), 80);
      }
      this.cdr.markForCheck();
    });
  }

  ngAfterViewInit(): void {
    // Re-position on window resize
    this.ngZone.runOutsideAngular(() => {
      const handler = () => {
        if (this.state?.active && this.state.currentStep) {
          this.ngZone.run(() => {
            this.positionTooltip(this.state!.currentStep!.targetId, this.state!.currentStep!.position);
          });
        }
      };
      window.addEventListener('resize', handler);
    });
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
    this.resizeObserver?.disconnect();
  }

  // ─── Actions ──────────────────────────────────────────────────────────────

  next(): void { this.tourService.next(); }
  prev(): void { this.tourService.prev(); }
  skip(): void { this.tourService.skipTour(); }
  done(): void { this.tourService.completeTour(); }

  get isLastStep(): boolean {
    if (!this.state) return false;
    return this.state.stepIndex === this.state.totalSteps - 1;
  }

  get isFirstStep(): boolean {
    return this.state?.stepIndex === 0;
  }

  /** Array for dot indicators */
  get steps(): number[] {
    return Array.from({ length: this.state?.totalSteps ?? 0 }, (_, i) => i);
  }

  // ─── Positioning ──────────────────────────────────────────────────────────

  private positionTooltip(targetId: string, preferredPosition: 'top' | 'bottom' | 'left' | 'right'): void {
    const target = document.getElementById(targetId);
    
    // Check if target is visible in the DOM
    const isVisible = target && target.offsetWidth > 0 && target.offsetHeight > 0;

    if (!isVisible) {
      // Centered fallback: target is hidden or doesn't exist (e.g. sidebar on mobile)
      this.highlightStyle = {
        display: 'none'
      };
      
      this.tooltipStyle = {
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        width: '340px',
        maxWidth: '90vw',
        zIndex: '9002'
      };
      
      this.arrowDirection = 'none';
      this.cdr.markForCheck();
      return;
    }

    const rect = target.getBoundingClientRect();
    const scroll = { x: window.scrollX, y: window.scrollY };

    const TOOLTIP_W = 340;
    const TOOLTIP_H = 220;
    const GAP = 18;
    const HIGHLIGHT_PAD = 8;

    // Mobile fallback (screen width < 576px)
    if (window.innerWidth < 576) {
      this.highlightStyle = {
        display: 'block',
        top: `${rect.top + scroll.y - HIGHLIGHT_PAD}px`,
        left: `${rect.left + scroll.x - HIGHLIGHT_PAD}px`,
        width: `${rect.width + HIGHLIGHT_PAD * 2}px`,
        height: `${rect.height + HIGHLIGHT_PAD * 2}px`
      };

      this.tooltipStyle = {
        position: 'fixed',
        bottom: '20px',
        left: '50%',
        transform: 'translateX(-50%)',
        width: 'calc(100% - 32px)',
        maxWidth: '360px',
        zIndex: '9002'
      };

      this.arrowDirection = 'none';
      this.cdr.markForCheck();
      return;
    }

    // Default target highlight style
    this.highlightStyle = {
      display: 'block',
      top: `${rect.top + scroll.y - HIGHLIGHT_PAD}px`,
      left: `${rect.left + scroll.x - HIGHLIGHT_PAD}px`,
      width: `${rect.width + HIGHLIGHT_PAD * 2}px`,
      height: `${rect.height + HIGHLIGHT_PAD * 2}px`
    };

    // Tooltip position relative to target
    let top = 0;
    let left = 0;
    let position = preferredPosition;

    switch (position) {
      case 'right':
        top = rect.top + scroll.y + rect.height / 2 - TOOLTIP_H / 2;
        left = rect.right + scroll.x + GAP;
        // Flip to left if off-screen
        if (left + TOOLTIP_W > window.innerWidth - 20) {
          position = 'left';
          left = rect.left + scroll.x - TOOLTIP_W - GAP;
        }
        break;
      case 'left':
        top = rect.top + scroll.y + rect.height / 2 - TOOLTIP_H / 2;
        left = rect.left + scroll.x - TOOLTIP_W - GAP;
        // Flip to right if off-screen
        if (left < 20) {
          position = 'right';
          left = rect.right + scroll.x + GAP;
        }
        break;
      case 'top':
        top = rect.top + scroll.y - TOOLTIP_H - GAP;
        left = rect.left + scroll.x + rect.width / 2 - TOOLTIP_W / 2;
        if (top < 20) {
          position = 'bottom';
          top = rect.bottom + scroll.y + GAP;
        }
        break;
      case 'bottom':
      default:
        top = rect.bottom + scroll.y + GAP;
        left = rect.left + scroll.x + rect.width / 2 - TOOLTIP_W / 2;
        break;
    }

    // Clamp horizontally
    left = Math.max(16, Math.min(left, window.innerWidth - TOOLTIP_W - 16));

    this.tooltipStyle = {
      top: `${top}px`,
      left: `${left}px`,
      width: `${TOOLTIP_W}px`
    };

    // Arrow direction points back toward the target
    const arrowMap: Record<string, 'top' | 'bottom' | 'left' | 'right'> = {
      right: 'left',
      left: 'right',
      top: 'bottom',
      bottom: 'top'
    };
    this.arrowDirection = arrowMap[position];

    this.cdr.markForCheck();
  }
}
