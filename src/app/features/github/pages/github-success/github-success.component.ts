import { Component, OnInit, OnDestroy, AfterViewInit, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import gsap from 'gsap';

@Component({
  selector: 'app-github-success',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './github-success.component.html',
  styleUrls: ['./github-success.component.scss']
})
export class GitHubSuccessComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('checkmark', { static: false }) checkmarkEl!: ElementRef<SVGCircleElement>;
  @ViewChild('ring', { static: false }) ringEl!: ElementRef;
  @ViewChild('contentWrap', { static: false }) contentWrap!: ElementRef;

  githubLogin = '';
  proTrialEndDate = '';
  trialStarted = false;
  formattedEndDate = '';

  private tl?: gsap.core.Timeline;

  constructor(private route: ActivatedRoute, private router: Router) {}

  ngOnInit(): void {
    this.route.queryParams.subscribe(params => {
      this.githubLogin    = params['githubLogin']    ?? '';
      this.trialStarted   = params['trialStarted']   === 'true';
      this.proTrialEndDate = params['proTrialEndDate'] ?? '';

      if (this.proTrialEndDate) {
        const d = new Date(this.proTrialEndDate);
        this.formattedEndDate = d.toLocaleDateString('en-US', {
          day: 'numeric', month: 'long', year: 'numeric'
        });
      }
    });
  }

  ngAfterViewInit(): void {
    this._runEntranceAnimation();
  }

  ngOnDestroy(): void {
    this.tl?.kill();
  }

  private _runEntranceAnimation(): void {
    this.tl = gsap.timeline({ defaults: { ease: 'power3.out' } });

    // 1. Particle ring burst
    if (this.ringEl?.nativeElement) {
      const particles = this.ringEl.nativeElement.querySelectorAll('.particle');
      gsap.set(particles, { scale: 0, opacity: 0 });
      this.tl.to(particles, {
        scale: 1,
        opacity: 1,
        duration: 0.6,
        stagger: 0.04,
        ease: 'back.out(2)'
      }, 0.3);
      this.tl.to(particles, {
        opacity: 0,
        scale: 1.8,
        duration: 0.8,
        stagger: 0.04,
        ease: 'power2.in'
      }, 0.9);
    }

    // 2. Content block slides up
    if (this.contentWrap?.nativeElement) {
      gsap.set(this.contentWrap.nativeElement, { y: 40, opacity: 0 });
      this.tl.to(this.contentWrap.nativeElement, {
        y: 0, opacity: 1, duration: 0.7, ease: 'back.out(1.4)'
      }, 0.2);
    }

    // 3. SVG checkmark stroke animation
    if (this.checkmarkEl?.nativeElement) {
      const circle = this.checkmarkEl.nativeElement;
      const len = circle.getTotalLength?.() ?? 200;
      gsap.set(circle, { strokeDasharray: len, strokeDashoffset: len });
      this.tl.to(circle, {
        strokeDashoffset: 0,
        duration: 0.9,
        ease: 'power2.out'
      }, 0.4);
    }
  }

  goToDashboard(): void {
    this.router.navigate(['/github/dashboard']);
  }
}
