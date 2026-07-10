import { Component, OnInit, OnDestroy, AfterViewInit } from '@angular/core';
import {
  FormBuilder, FormGroup, Validators, ReactiveFormsModule
} from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { CommonModule } from '@angular/common';
import { FeedbackService } from '../../services/feedback.service';
import { FeedbackStateService } from '../../services/feedback-state.service';
import { ToastService } from 'src/app/core/services/toast.service';
import { StarRatingComponent } from 'src/app/shared/components/star-rating/star-rating.component';
import { FeedbackType, FeedbackStatus, FeedbackRating } from 'src/app/shared/interfaces/feedback';
import { Developer } from 'src/app/shared/interfaces/developer';
import { gsap } from 'gsap';

@Component({
  selector: 'app-feedback-form',
  templateUrl: './feedback-form.component.html',
  styleUrls: ['./feedback-form.component.scss'],
  // Note: FeedbackFormComponent is declared (not standalone) in FeedbackModule.
  // StarRatingComponent is standalone — import it via the module.
})
export class FeedbackFormComponent implements OnInit, AfterViewInit, OnDestroy {
  private destroy$ = new Subject<void>();

  form!: FormGroup;
  isEditMode = false;
  feedbackId: string | null = null;
  isSubmitting = false;
  currentUser: Developer | null = null;

  readonly types: FeedbackType[] = ['bug', 'feature_request', 'general', 'improvement'];
  readonly statuses: FeedbackStatus[] = ['pending', 'under_review', 'resolved', 'closed'];
  readonly ratings: FeedbackRating[] = [1, 2, 3, 4, 5];

  readonly typeLabels: Record<FeedbackType, string> = {
    bug:             '🐛 Bug Report',
    feature_request: '✨ Feature Request',
    general:         '💬 General Feedback',
    improvement:     '🔧 Improvement',
  };

  constructor(
    private fb: FormBuilder,
    private feedbackService: FeedbackService,
    private stateService: FeedbackStateService,
    private route: ActivatedRoute,
    private router: Router,
    private toast: ToastService
  ) {}

  // ── Lifecycle ─────────────────────────────────────────────────────────────
  ngOnInit(): void {
    this.stateService.currentUser$
      .pipe(takeUntil(this.destroy$))
      .subscribe(user => {
        this.currentUser = user;
        this.buildForm();                     // rebuild if role arrives late
      });

    this.feedbackId = this.route.snapshot.paramMap.get('id');
    this.isEditMode = !!this.feedbackId;

    if (this.isEditMode && this.feedbackId) {
      this.loadExistingFeedback(this.feedbackId);
    }
  }

  ngAfterViewInit(): void {
    // Agent 3 — GSAP blob animations
    gsap.to('.blob-1', { y: 50, x: -30, duration: 7, yoyo: true, repeat: -1, ease: 'sine.inOut' });
    gsap.to('.blob-2', { y: -50, x: 40, duration: 9, yoyo: true, repeat: -1, ease: 'sine.inOut' });

    // Agent 3 — Form card entrance animation
    gsap.from('.fb-form-card', {
      y: 40, opacity: 0, duration: 0.65, ease: 'back.out(1.3)'
    });
  }

  // ── Form Builder ─────────────────────────────────────────────────────────
  private buildForm(): void {
    const isAdmin = this.currentUser?.role === 'admin';
    this.form = this.fb.group({
      // ── User fields (mirrors Joi validation constraints from backend) ────
      type:    ['general'],
      subject: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(120)]],
      message: ['', [Validators.required, Validators.minLength(10), Validators.maxLength(2000)]],
      rating:  [null, [Validators.required, Validators.min(1), Validators.max(5)]],
      // ── Admin-only: disabled for non-admins (mass-assignment protection) ──
      status:    [{ value: 'pending',  disabled: !isAdmin }],
      adminNote: [{ value: '',         disabled: !isAdmin }, [Validators.maxLength(1000)]],
    });
  }

  private loadExistingFeedback(id: string): void {
    this.feedbackService.getById(id).pipe(takeUntil(this.destroy$)).subscribe({
      next: res => {
        const fb = res.data.feedback;
        this.form.patchValue({
          type: fb.type, subject: fb.subject,
          message: fb.message, rating: fb.rating,
          status: fb.status, adminNote: fb.adminNote ?? '',
        });
      },
      error: err => {
        this.toast.error(err?.error?.message || 'Could not load feedback.');
        this.router.navigate(['/feedback']);
      },
    });
  }

  // ── Submit ────────────────────────────────────────────────────────────────
  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.toast.warning('Please fill in all required fields correctly.');
      return;
    }

    this.isSubmitting = true;
    const isAdmin = this.currentUser?.role === 'admin';
    const raw = this.form.getRawValue();

    // Build DTO — strip admin fields for developers
    const dto: any = {
      type: raw.type, subject: raw.subject,
      message: raw.message, rating: raw.rating,
    };
    if (isAdmin) {
      if (raw.status)        dto.status    = raw.status;
      if (raw.adminNote != null) dto.adminNote = raw.adminNote;
    }

    if (this.isEditMode && this.feedbackId) {
      this.feedbackService.update(this.feedbackId, dto).pipe(takeUntil(this.destroy$)).subscribe({
        next: () => {
          this.toast.success('Feedback updated successfully!');
          this.router.navigate(['/feedback']);
        },
        error: err => this.handleSubmitError(err),
      });
    } else {
      this.feedbackService.submit(dto).pipe(takeUntil(this.destroy$)).subscribe({
        next: () => {
          this.toast.success('Feedback submitted successfully!');
          this.router.navigate(['/feedback']);
        },
        error: err => this.handleSubmitError(err),
      });
    }
  }

  // ── Error Handler (Agent 1: maps 403/400 to semantic toasts) ─────────────
  private handleSubmitError(err: any): void {
    this.isSubmitting = false;
    const status  = err?.status;
    const message = err?.error?.message || 'An error occurred.';

    if (status === 403) {
      this.toast.error(`🔒 Unauthorized: ${message}`);
    } else if (status === 400) {
      this.toast.warning(`⚠️ Validation error: ${message}`);
    } else {
      this.toast.error(message);
    }
  }

  cancel(): void { this.router.navigate(['/feedback']); }

  hasError(control: string, error: string): boolean {
    const c = this.form.get(control);
    return !!(c && c.touched && c.hasError(error));
  }

  get msgLength(): number { return this.form.get('message')?.value?.length ?? 0; }
  get isAdmin(): boolean  { return this.currentUser?.role === 'admin'; }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
