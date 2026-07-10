import { Component, OnInit, AfterViewInit, ElementRef, OnDestroy, HostListener } from '@angular/core';
import { AuthService } from 'src/app/core/services/auth.service';
import { Router } from '@angular/router';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

@Component({
  selector: 'app-guesthome',
  templateUrl: './guesthome.component.html',
  styleUrls: ['./guesthome.component.scss'],
})
export class GuesthomeComponent implements OnInit, AfterViewInit, OnDestroy {
  isLoggedIn = false;
  private isMobile = false;
  
  // Track specific listeners for proper ngOnDestroy cleanup
  private mouseMoveHandler?: (e: MouseEvent) => void;
  private mouseLeaveHandler?: () => void;

  constructor(
    private authService: AuthService, 
    private router: Router,
    private el: ElementRef
  ) {
    this.checkScreenSize();
  }

  @HostListener('window:resize')
  onResize() {
    this.checkScreenSize();
  }

  private checkScreenSize() {
    this.isMobile = window.innerWidth <= 768;
  }

  ngOnInit() {
    this.authService.isLoggedIn$.subscribe((status) => {
      this.isLoggedIn = status;
    });
  }

  ngAfterViewInit() {
    setTimeout(() => {
      this.initCinematicAnimations();
    }, 100);
  }

  initCinematicAnimations() {
    const q = gsap.utils.selector(this.el);

    // TASK 3: GSAP Sequence Timeline for Page Load
    const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });

    tl.from(q('.hero-badge'), { y: -30, opacity: 0, duration: 0.8 })
      .from(q('.hero-title'), { y: 40, opacity: 0, scale: 0.95, duration: 1, stagger: 0.2 }, "-=0.4")
      .from(q('.hero-subtitle'), { y: 30, opacity: 0, duration: 0.8 }, "-=0.6")
      .from(q('.hero-status'), { y: 20, opacity: 0, duration: 0.6 }, "-=0.5")
      .from(q('.hero-cta-group'), { y: 20, opacity: 0, scale: 0.95, duration: 0.8 }, "-=0.4")
      .from(q('.hero-dashboard-mockup'), { 
        y: 100, 
        rotateX: 10, 
        scale: 0.92,
        opacity: 0, 
        duration: 1.5, 
        ease: 'power4.out' 
      }, "-=0.4");

    // TASK 2: Ambient Levitation (Floating Effect)
    gsap.to(q('.floating-element'), {
      y: -25,
      duration: 3,
      ease: 'sine.inOut',
      yoyo: true,
      repeat: -1
    });

    // TASK 2: 3D Mouse Interaction
    const heroSection = this.el.nativeElement.querySelector('.hero-section');
    const mockupFrame = this.el.nativeElement.querySelector('.mockup-frame');
    
    if (heroSection && mockupFrame) {
      this.mouseMoveHandler = (e: MouseEvent) => {
        // TASK 4: Disable 3D follow on mobile
        if (this.isMobile) return; 

        const rect = heroSection.getBoundingClientRect();
        
        // Calculate coordinate shifts relative to the center of the hero bounds (-0.5 to 0.5)
        const xPos = (e.clientX - rect.left) / rect.width - 0.5;
        const yPos = (e.clientY - rect.top) / rect.height - 0.5;

        // Determine max tilt angle (15 degrees)
        const tiltX = -yPos * 15; 
        const tiltY = xPos * 15;

        gsap.to(mockupFrame, {
          rotateX: tiltX,
          rotateY: tiltY,
          transformPerspective: 1500,
          transformOrigin: 'center center',
          duration: 0.6,
          ease: 'power2.out'
        });
      };
      
      this.mouseLeaveHandler = () => {
        if (this.isMobile) return;
        
        // Smooth snap back to identity
        gsap.to(mockupFrame, {
          rotateX: 0,
          rotateY: 0,
          duration: 1.2,
          ease: 'elastic.out(1, 0.4)'
        });
      };

      heroSection.addEventListener('mousemove', this.mouseMoveHandler);
      heroSection.addEventListener('mouseleave', this.mouseLeaveHandler);
    }

    // TASK 3: Scroll-Triggered Reveals (Sophisticated scale/slide)
    
    // Abstract elements generic reveal
    const revealElements = q('.gsap-reveal');
    revealElements.forEach((el: any) => {
      gsap.from(el, {
        scrollTrigger: {
          trigger: el,
          scroller: '.content-area',
          start: 'top 85%',
          toggleActions: 'play none none reverse'
        },
        y: 50,
        scale: 0.95,
        opacity: 0,
        duration: 0.8,
        ease: 'power3.out'
      });
    });

    // Advanced staggered reveal for features grid
    const featuresGrid = q('.features-grid');
    if (featuresGrid && featuresGrid.length > 0) {
      gsap.from(q('.feature-card'), {
        scrollTrigger: {
          trigger: featuresGrid[0],
          scroller: '.content-area',
          start: 'top 80%',
        },
        y: 60,
        scale: 0.9,
        opacity: 0,
        duration: 1,
        stagger: 0.15, // Task 3 parameter
        ease: 'back.out(1.2)'
      });
    }
  }

  gotoRegister() {
    this.router.navigate(['auth/register']);
  }
  
  gotoDemo() {
    const demoSection = this.el.nativeElement.querySelector('#demo-section');
    if (demoSection) {
      demoSection.scrollIntoView({ behavior: 'smooth' });
    }
  }

  // TASK 3: Strict Memory Management
  ngOnDestroy() {
    const heroSection = this.el.nativeElement.querySelector('.hero-section');
    
    // Clean up specific DOM listeners
    if (heroSection) {
      if (this.mouseMoveHandler) heroSection.removeEventListener('mousemove', this.mouseMoveHandler);
      if (this.mouseLeaveHandler) heroSection.removeEventListener('mouseleave', this.mouseLeaveHandler);
    }

    // Kill all GSAP context, Timelines, and ScrollTriggers for this class
    ScrollTrigger.getAll().forEach(trigger => trigger.kill());
    gsap.killTweensOf(this.el.nativeElement.querySelectorAll('*'));
  }
}