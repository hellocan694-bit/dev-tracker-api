import {
  Component,
  OnInit,
  OnDestroy,
  AfterViewInit,
  ViewChild,
  ElementRef,
  Input,
  Output,
  EventEmitter,
  ChangeDetectorRef,
  ChangeDetectionStrategy
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import gsap from 'gsap';

import { OnboardingMessage, BottleneckAlert, PriorityFile } from 'src/app/shared/interfaces/onboarding.model';
import { OnboardingService } from 'src/app/core/services/onboarding.service';

@Component({
  selector: 'app-onboarding-modal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './onboarding-modal.component.html',
  styleUrls: ['./onboarding-modal.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class OnboardingModalComponent implements OnInit, AfterViewInit, OnDestroy {

  // ─── Template refs ────────────────────────────────────────────────────────
  @ViewChild('modalOverlay') overlayRef!: ElementRef<HTMLElement>;
  @ViewChild('modalPanel') panelRef!: ElementRef<HTMLElement>;
  @ViewChild('greetingText') greetingRef!: ElementRef<HTMLElement>;
  @ViewChild('closingText') closingRef!: ElementRef<HTMLElement>;
  @ViewChild('subjectText') subjectRef!: ElementRef<HTMLElement>;
  @ViewChild('snapshotCard') snapshotRef!: ElementRef<HTMLElement>;
  @ViewChild('priorityCard') priorityRef!: ElementRef<HTMLElement>;
  @ViewChild('alertsCard') alertsRef!: ElementRef<HTMLElement>;
  @ViewChild('missionCard') missionRef!: ElementRef<HTMLElement>;

  // ─── Inputs / Outputs ─────────────────────────────────────────────────────
  @Input() set triggerMessage(msg: OnboardingMessage | null) {
    if (msg) { this.openWith(msg); }
  }

  @Output() closed = new EventEmitter<void>();

  // ─── State ────────────────────────────────────────────────────────────────
  isVisible = false;
  isAnimating = false;
  message: OnboardingMessage | null = null;

  // GSAP text-scramble state
  private scrambleTween?: gsap.core.Tween;
  private subscription?: Subscription;

  // Scramble character pool (cyberpunk feel)
  private readonly CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789@#$%^&*';

  constructor(
    private onboardingService: OnboardingService,
    private cdr: ChangeDetectorRef
  ) { }

  // ─── Lifecycle ────────────────────────────────────────────────────────────

  ngOnInit(): void {
    // Subscribe to the shared stream; auto-open whenever ARIA sends a message
    this.subscription = this.onboardingService.onboardingMessage$.subscribe(msg => {
      this.openWith(msg);
    });
  }

  ngAfterViewInit(): void {
    // Panel starts hidden – GSAP will handle visibility
    if (this.panelRef?.nativeElement) {
      gsap.set(this.panelRef.nativeElement, { autoAlpha: 0, y: 40, scale: 0.96 });
    }
  }

  ngOnDestroy(): void {
    this.subscription?.unsubscribe();
    this.scrambleTween?.kill();
  }

  // ─── Public helpers ───────────────────────────────────────────────────────

  openWith(rawMsg: any): void {
    // Robust parsing to handle partial/malformed AI backend data
    this.message = {
      subject: rawMsg.subject || 'System transmission received',
      greeting: rawMsg.greeting || 'Connecting to project mainframe...',
      closingSignal: rawMsg.closingSignal || 'ARIA out.',
      projectSnapshot: {
        projectName: rawMsg.projectSnapshot?.projectName || 'Unknown',
        summary: rawMsg.projectSnapshot?.summary || '',
        totalTasks: rawMsg.projectSnapshot?.totalTasks || 0,
        activeTasks: rawMsg.projectSnapshot?.activeTasks || 0,
        completedTasks: rawMsg.projectSnapshot?.completedTasks || 0,
        completionPercentage: rawMsg.projectSnapshot?.completionPercentage || 0,
        teamSize: rawMsg.projectSnapshot?.teamSize || 0,
        techStack: rawMsg.projectSnapshot?.techStack || []
      },
      priorityFiles: Array.isArray(rawMsg.priorityFiles) ? rawMsg.priorityFiles : [],
      bottleneckAlerts: Array.isArray(rawMsg.bottleneckAlerts) ? rawMsg.bottleneckAlerts : [],
      firstMission: {
        title: rawMsg.firstMission?.title || 'Standby for assignment',
        description: rawMsg.firstMission?.description || 'Awaiting orders from project lead.',
        estimatedHours: rawMsg.firstMission?.estimatedHours || 0,
        deadline: rawMsg.firstMission?.deadline || new Date().toISOString(),
        priority: rawMsg.firstMission?.priority || 'low',
        relatedFiles: rawMsg.firstMission?.relatedFiles || []
      }
    };

    this.isVisible = true;
    this.cdr.detectChanges();          // let Angular render the template first
    this.runEntranceAnimation();
  }

  close(): void {
    if (this.isAnimating) return;
    this.isAnimating = true;

    const tl = gsap.timeline({
      onComplete: () => {
        this.isVisible = false;
        this.isAnimating = false;
        this.message = null;
        this.cdr.detectChanges();
        this.closed.emit();
      }
    });

    tl.to(this.panelRef.nativeElement, {
      autoAlpha: 0, y: 40, scale: 0.96, duration: 0.35, ease: 'power2.in'
    });

    if (this.overlayRef?.nativeElement) {
      tl.to(this.overlayRef.nativeElement, {
        autoAlpha: 0, duration: 0.25, ease: 'none'
      }, '<');
    }
  }

  /** Utility for the template to pick the right severity icon */
  alertIcon(severity: BottleneckAlert['severity']): string {
    const map: Record<string, string> = {
      danger: '🔴',
      warning: '⚠️',
      info: '💡'
    };
    return map[severity] ?? '⚠️';
  }

  /** Badge colour class for priority files */
  riskClass(risk: PriorityFile['riskLevel']): string {
    const map: Record<string, string> = {
      critical: 'risk--critical',
      high: 'risk--high',
      medium: 'risk--medium',
      low: 'risk--low'
    };
    return map[risk ?? 'low'] ?? 'risk--low';
  }

  /** Progress-bar width string for the snapshot */
  progressWidth(): string {
    const pct = this.message?.projectSnapshot.completionPercentage ?? 0;
    return `${Math.min(100, Math.max(0, pct))}%`;
  }

  // ─── GSAP Animations ──────────────────────────────────────────────────────

  /**
   * ngAfterViewInit entry point for the full entrance sequence.
   *
   * Flow:
   *  1. Overlay fades in.
   *  2. Panel rises + fades in.
   *  3. Subject text scrambles into its final value.
   *  4. Cards stagger-slide in: Snapshot → Priority Files → Alerts → Mission.
   *  5. Greeting types out character-by-character.
   *  6. Closing signal appears with a flicker.
   */
  private runEntranceAnimation(): void {
    // Guard: refs might not be available yet after detectChanges
    if (!this.panelRef?.nativeElement) return;

    this.isAnimating = true;
    const tl = gsap.timeline({ onComplete: () => { this.isAnimating = false; } });

    // 1 ▸ Overlay
    if (this.overlayRef?.nativeElement) {
      gsap.set(this.overlayRef.nativeElement, { autoAlpha: 0 });
      tl.to(this.overlayRef.nativeElement, { autoAlpha: 1, duration: 0.4, ease: 'none' });
    }

    // 2 ▸ Panel rise
    gsap.set(this.panelRef.nativeElement, { autoAlpha: 0, y: 50, scale: 0.95 });
    tl.to(this.panelRef.nativeElement, {
      autoAlpha: 1, y: 0, scale: 1, duration: 0.55, ease: 'back.out(1.6)'
    }, '-=0.15');

    // 3 ▸ Subject scramble
    if (this.subjectRef?.nativeElement && this.message?.subject) {
      this.scrambleText(this.subjectRef.nativeElement, this.message.subject, tl, '-=0.2');
    }

    // 4 ▸ Cards stagger (snapshot, priority, alerts, mission)
    const cards = [
      this.snapshotRef?.nativeElement,
      this.priorityRef?.nativeElement,
      this.alertsRef?.nativeElement,
      this.missionRef?.nativeElement
    ].filter(Boolean);

    if (cards.length) {
      gsap.set(cards, { autoAlpha: 0, y: 30 });
      tl.to(cards, {
        autoAlpha: 1, y: 0,
        duration: 0.5, ease: 'power3.out',
        stagger: 0.12
      }, '-=0.1');
    }

    // 5 ▸ Greeting typewriter
    if (this.greetingRef?.nativeElement && this.message?.greeting) {
      this.typewriterEffect(this.greetingRef.nativeElement, this.message.greeting, tl, '-=0.3');
    }

    // 6 ▸ Closing flicker
    if (this.closingRef?.nativeElement) {
      gsap.set(this.closingRef.nativeElement, { autoAlpha: 0 });
      tl.to(this.closingRef.nativeElement, {
        autoAlpha: 1, duration: 0.2, repeat: 3, yoyo: true, ease: 'none'
      }).to(this.closingRef.nativeElement, { autoAlpha: 1, duration: 0.3 });
    }
  }

  /**
   * Text-scramble effect: cycles random chars before resolving to the real value.
   * Plugs directly into a GSAP timeline via the position param.
   */
  private scrambleText(
    el: HTMLElement,
    finalText: string,
    tl: gsap.core.Timeline,
    position: string | number = '>'
  ): void {
    const duration = 0.8;
    const frameRate = 1 / 20;          // 20 fps scramble
    const totalFrames = Math.round(duration / frameRate);
    let frame = 0;

    tl.call(() => {
      const interval = setInterval(() => {
        frame++;
        const progress = frame / totalFrames;
        const revealUpTo = Math.floor(progress * finalText.length);
        let display = '';
        for (let i = 0; i < finalText.length; i++) {
          if (i < revealUpTo || finalText[i] === ' ') {
            display += finalText[i];
          } else {
            display += this.CHARS[Math.floor(Math.random() * this.CHARS.length)];
          }
        }
        el.textContent = display;
        if (frame >= totalFrames) {
          clearInterval(interval);
          el.textContent = finalText;
        }
      }, frameRate * 1000);
    }, [], position);

    // Advance timeline by the scramble duration
    tl.to({}, { duration });
  }

  /**
   * Typewriter: inserts characters one at a time into the element's textContent.
   */
  private typewriterEffect(
    el: HTMLElement,
    text: string,
    tl: gsap.core.Timeline,
    position: string | number = '>'
  ): void {
    const perChar = 0.022;
    el.textContent = '';

    tl.call(() => {
      let i = 0;
      const interval = setInterval(() => {
        el.textContent += text[i];
        i++;
        if (i >= text.length) clearInterval(interval);
      }, perChar * 1000);
    }, [], position);

    tl.to({}, { duration: text.length * perChar });
  }
}
