import {
  Component, Input, Output, EventEmitter,
  ViewChild, ElementRef, AfterViewInit, OnDestroy
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import gsap from 'gsap';

@Component({
  selector: 'app-upsell-modal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './upsell-modal.component.html',
  styleUrls: ['./upsell-modal.component.scss']
})
export class UpsellModalComponent implements AfterViewInit, OnDestroy {
  /** Human-readable name of the locked feature, e.g. "Custom Webhook Rules" */
  @Input() featureName = 'Premium Feature';

  /** Emitted when the user explicitly closes the modal */
  @Output() closed = new EventEmitter<void>();

  @ViewChild('modalCard') modalCardRef!: ElementRef<HTMLElement>;
  @ViewChild('ctaBtn')    ctaBtnRef!:   ElementRef<HTMLElement>;

  private entranceTl!: gsap.core.Timeline;
  private ctaGlowTween!: gsap.core.Tween;

  constructor(private router: Router) {}

  ngAfterViewInit(): void {
    const card = this.modalCardRef.nativeElement;
    const cta  = this.ctaBtnRef.nativeElement;

    // ── Entrance: scale-up + fade ──────────────────────────────────────────
    this.entranceTl = gsap.timeline();
    this.entranceTl
      .fromTo(card,
        { scale: 0.88, opacity: 0, y: 30 },
        { scale: 1,    opacity: 1, y: 0, duration: 0.45, ease: 'back.out(1.7)' }
      )
      .fromTo(card.querySelectorAll('.upsell-modal__lock-icon, .upsell-modal__title, .upsell-modal__subtitle'),
        { y: 12, opacity: 0 },
        { y: 0,  opacity: 1, duration: 0.35, stagger: 0.08, ease: 'power2.out' },
        '-=0.15'
      )
      .fromTo(card.querySelectorAll('.upsell-modal__perks li'),
        { x: -12, opacity: 0 },
        { x: 0,   opacity: 1, duration: 0.3, stagger: 0.07, ease: 'power2.out' },
        '-=0.1'
      );

    // ── Ambient CTA glow pulse ─────────────────────────────────────────────
    this.ctaGlowTween = gsap.to(cta, {
      boxShadow: '0 6px 36px rgba(167,139,250,0.75), 0 0 0 1px rgba(167,139,250,0.40)',
      duration: 1.4,
      yoyo: true,
      repeat: -1,
      ease: 'power1.inOut'
    });
  }

  ngOnDestroy(): void {
    this.entranceTl?.kill();
    this.ctaGlowTween?.kill();
  }

  close(): void {
    const card = this.modalCardRef.nativeElement;
    gsap.to(card, {
      scale: 0.9, opacity: 0, y: 20, duration: 0.25, ease: 'power2.in',
      onComplete: () => this.closed.emit()
    });
  }

  onBackdropClick(event: MouseEvent): void {
    if ((event.target as HTMLElement).classList.contains('upsell-modal-backdrop')) {
      this.close();
    }
  }

  onUpgrade(): void {
    this.closed.emit();
    this.router.navigate(['/home/developersettings']);
  }
}
