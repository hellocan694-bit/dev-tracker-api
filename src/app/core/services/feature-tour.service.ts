import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export interface TourStep {
  targetId: string;       // CSS id of the element to highlight
  title: string;
  body: string;
  position: 'top' | 'bottom' | 'left' | 'right';
  icon: string;           // bootstrap-icons class
}

export interface TourState {
  active: boolean;
  stepIndex: number;
  totalSteps: number;
  currentStep: TourStep | null;
}

const TOUR_STEPS: TourStep[] = [
  {
    targetId: 'tour-step-welcome',
    title: '🚀 Welcome to DevTrack!',
    body: 'This is your developer workspace. Here you can see your active projects, track your weekly hours, and view productivity metrics. Click <strong>"New Project"</strong> to launch a new operation!',
    position: 'bottom',
    icon: 'bi-compass'
  },
  {
    targetId: 'tour-step-tracker',
    title: '⏱️ Session Tracker & Analytics',
    body: 'The Weekly Productivity chart tracks your logged hours automatically. Inside a project, hit <strong>▶ Play</strong> on any task to start a timed session. Your progress updates in real time.',
    position: 'left',
    icon: 'bi-stopwatch'
  },
  {
    targetId: 'tour-step-github',
    title: '🔗 GitHub Integration',
    body: 'Connect your GitHub account here to sync repositories, pull requests, and commit activity directly into your project dashboards. Click <strong>GitHub Integration</strong> in the sidebar.',
    position: 'right',
    icon: 'bi-github'
  }
];

const TOUR_COMPLETED_KEY = 'devtracker_tour_completed';

@Injectable({ providedIn: 'root' })
export class FeatureTourService {

  private _state$ = new BehaviorSubject<TourState>({
    active: false,
    stepIndex: 0,
    totalSteps: TOUR_STEPS.length,
    currentStep: null
  });

  readonly state$ = this._state$.asObservable();

  /** Returns true only when the user has never completed the tour */
  isFirstTimeUser(): boolean {
    return !localStorage.getItem(TOUR_COMPLETED_KEY);
  }

  /** Launch the tour (call this from the dashboard on first login) */
  startTour(): void {
    if (!this.isFirstTimeUser()) return;
    this._emitStep(0);
  }

  /** Force-start (e.g. from a help button) even if completed before */
  restartTour(): void {
    this._emitStep(0);
  }

  next(): void {
    const { stepIndex, totalSteps } = this._state$.value;
    if (stepIndex < totalSteps - 1) {
      this._emitStep(stepIndex + 1);
    } else {
      this.completeTour();
    }
  }

  prev(): void {
    const { stepIndex } = this._state$.value;
    if (stepIndex > 0) {
      this._emitStep(stepIndex - 1);
    }
  }

  skipTour(): void {
    this._markCompleted();
  }

  completeTour(): void {
    this._markCompleted();
  }

  private _emitStep(index: number): void {
    this._state$.next({
      active: true,
      stepIndex: index,
      totalSteps: TOUR_STEPS.length,
      currentStep: TOUR_STEPS[index]
    });
  }

  private _markCompleted(): void {
    localStorage.setItem(TOUR_COMPLETED_KEY, 'true');
    this._state$.next({
      active: false,
      stepIndex: 0,
      totalSteps: TOUR_STEPS.length,
      currentStep: null
    });
  }
}
