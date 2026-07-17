import { Component, OnInit, AfterViewInit, ElementRef, OnDestroy, HostListener, NgZone, Renderer2 } from '@angular/core';
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
  isYearly = false;
  private isMobile = false;
  private mm = gsap.matchMedia();

  // Track specific listeners for proper ngOnDestroy cleanup
  private mouseMoveHandler?: (e: MouseEvent) => void;
  private mouseLeaveHandler?: () => void;

  // Spotlight pointer listeners
  private pointerMoveListener?: () => void;
  private pointerLeaveListener?: () => void;
  private pointerEnterListener?: () => void;

  // Bento spotlight listeners
  private bentoMouseMoveHandler?: (e: MouseEvent) => void;
  private bentoMouseEnterHandler?: (e: MouseEvent) => void;
  private bentoMouseLeaveHandler?: (e: MouseEvent) => void;
  private bentoSectionEl?: HTMLElement;

  // Navbar scroll listener
  private navScrollHandler?: () => void;

  constructor(
    private authService: AuthService,
    private router: Router,
    private el: ElementRef,
    private ngZone: NgZone,
    private renderer: Renderer2
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
      this.initSpotlightEffect();
      this.initStickyShowcase();
      this.initWebhookSimulator();
      this.initBentoAnimations();
      this.initWorkflowFlowchart();
      this.initAdminSimulator();
      this.initReactiveNavbar();
      this.initBentoSpotlight();
    }, 100);
  }

  // ── Webhook Simulator ────────────────────────────────────────────────────

  initWebhookSimulator() {
    const container = document.getElementById('webhook-lines-container');
    const cursor = document.getElementById('terminal-cursor');
    const body = document.getElementById('terminal-body');
    if (!container) return;

    const events = [
      { label: 'POST /webhook/github', color: 't-dim', suffix: '' },
      { label: '→ event: push', color: 't-blue', suffix: '' },
      { label: '→ ref: refs/heads/main', color: 't-white', suffix: '' },
      { label: '→ commits: 3 detected', color: 't-yellow', suffix: '' },
      { label: '✓ synced → devtrack.db in 2ms', color: 't-green', suffix: '' },
      { label: '', color: '', suffix: '' }, // blank spacer
      { label: 'POST /webhook/github', color: 't-dim', suffix: '' },
      { label: '→ event: pull_request #142', color: 't-purple', suffix: '' },
      { label: '→ action: review_requested', color: 't-white', suffix: '' },
      { label: '→ assignee: @sarah', color: 't-yellow', suffix: '' },
      { label: '✓ Aria notified reviewer in 5ms', color: 't-green', suffix: '' },
      { label: '', color: '', suffix: '' },
      { label: 'POST /webhook/github', color: 't-dim', suffix: '' },
      { label: '→ event: workflow_run (CI/CD)', color: 't-blue', suffix: '' },
      { label: '→ conclusion: success ✓', color: 't-green', suffix: '' },
      { label: '→ duration: 1m 42s', color: 't-white', suffix: '' },
      { label: '✓ deployment triggered 8ms', color: 't-green', suffix: '' },
    ];

    let currentLine = 0;
    const totalDelay = 0;

    const typeNextLine = (index: number) => {
      if (index >= events.length) return;
      const event = events[index];

      const delay = index === 0 ? 800 : 300 + Math.random() * 200;

      setTimeout(() => {
        const lineEl = document.createElement('div');
        lineEl.className = `terminal-line injected ${event.color}`;
        lineEl.textContent = event.label;
        container.appendChild(lineEl);

        // Auto-scroll terminal body
        if (body) body.scrollTop = body.scrollHeight;

        typeNextLine(index + 1);
      }, delay);
    };

    // Blink cursor then start after 1.2s
    setTimeout(() => typeNextLine(0), 1200);
  }

  // ── Bento Grid Animations ────────────────────────────────────────────────

  initBentoAnimations() {
    const cards = document.querySelectorAll('.bento-card');
    if (!cards.length) return;

    this.mm.add('(min-width: 992px)', () => {
      gsap.from(cards, {
        scrollTrigger: {
          trigger: '.bento-grid',
          scroller: '.content-area',
          start: 'top 80%',
          invalidateOnRefresh: true,
        },
        y: 60,
        opacity: 0,
        scale: 0.96,
        duration: 0.8,
        stagger: {
          each: 0.1,
          from: 'start'
        },
        ease: 'power3.out',
      });
    });
  }

  // ── Pricing Toggle ───────────────────────────────────────────────────────

  toggleBilling() {
    this.isYearly = !this.isYearly;
    const prices: Record<string, { monthly: number; yearly: number }> = {
      'price-free':       { monthly: 0,  yearly: 0 },
      'price-pro':        { monthly: 19, yearly: 15 },
      'price-enterprise': { monthly: 79, yearly: 63 },
    };

    Object.entries(prices).forEach(([id, val]) => {
      const el = document.getElementById(id);
      if (!el) return;

      const from = this.isYearly ? val.monthly : val.yearly;
      const to   = this.isYearly ? val.yearly  : val.monthly;
      const counter = { val: from };

      // Scale+fade out, count, scale+fade in
      gsap.timeline()
        .to(el, { scale: 0.75, opacity: 0, duration: 0.18, ease: 'power2.in' })
        .call(() => {
          gsap.to(counter, {
            val: to,
            duration: 0.5,
            ease: 'power1.out',
            onUpdate: () => { el.textContent = Math.round(counter.val).toString(); },
          });
        })
        .to(el, { scale: 1, opacity: 1, duration: 0.3, ease: 'back.out(1.4)' }, '+=0.08');
    });
  }

  // ── Flowchart Animation ──────────────────────────────────────────────────

  initWorkflowFlowchart() {
    const nodes = this.el.nativeElement.querySelectorAll('.fc-node');
    const chartBars = this.el.nativeElement.querySelectorAll('.fc-chart-bar');
    if (!nodes.length) return;

    this.mm.add("(min-width: 992px)", () => {
      // Set initial minimal state
      gsap.set(nodes, { borderColor: 'rgba(255, 255, 255, 0.05)', backgroundColor: 'rgba(10, 11, 16, 0.7)' });
      gsap.set(chartBars, { height: '15%' });

      // Create looping timeline
      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: '.workflow-flowchart-section',
          scroller: '.content-area',
          start: 'top 75%',
          toggleActions: 'play none none none',
          invalidateOnRefresh: true
        },
        repeat: -1,
        repeatDelay: 1.5
      });

      // Animate flowing pulse through nodes and connectors
      nodes.forEach((node: any, idx: number) => {
        // Highlight current node
        const glowColor = idx % 2 === 0 ? 'rgba(52, 152, 219, 0.5)' : 'rgba(142, 68, 173, 0.5)';
        tl.to(node, {
          borderColor: glowColor,
          backgroundColor: 'rgba(255, 255, 255, 0.02)',
          boxShadow: `0 0 15px ${glowColor.replace('0.5', '0.15')}`,
          scale: 1.04,
          duration: 0.45,
          ease: 'power2.out'
        });

        // Connector line glow transit
        if (idx < nodes.length - 1) {
          const glowLine = this.el.nativeElement.querySelector(`#fc-line-${idx} .fc-line-glow`);
          if (glowLine) {
            tl.fromTo(glowLine,
              { left: '-100%' },
              { left: '100%', duration: 0.55, ease: 'power1.inOut' }
            );
          }
        }

        // Return node to standard scale
        tl.to(node, {
          scale: 1,
          duration: 0.25,
          ease: 'power2.in'
        }, '-=0.15');
      });

      // Update the mock dashboard chart heights when pulse completes
      tl.to(chartBars, {
        height: (i) => {
          const heights = ['60%', '85%', '70%', '95%', '90%'];
          return heights[i];
        },
        backgroundColor: '#10b981',
        boxShadow: '0 0 15px rgba(16, 185, 129, 0.3)',
        stagger: 0.08,
        duration: 0.5,
        ease: 'back.out(1.5)'
      });

      // Stagger reset the bars back to sleep mode
      tl.to(chartBars, {
        height: '15%',
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        boxShadow: 'none',
        duration: 0.4,
        ease: 'power2.inOut'
      }, '+=2.0');
    });
  }

  // ── Workspace Admin Simulator ────────────────────────────────────────────

  initAdminSimulator() {
    const inviteBtn = this.el.nativeElement.querySelector('#sim-invite-btn');
    const emailInput = this.el.nativeElement.querySelector('#sim-email-input') as HTMLInputElement;
    const workspaceList = this.el.nativeElement.querySelector('#sim-workspace-list');
    const toast = this.el.nativeElement.querySelector('#sim-toast');
    if (!inviteBtn || !emailInput || !workspaceList) return;

    const resetSim = () => {
      emailInput.value = '';
      inviteBtn.disabled = true;
      inviteBtn.innerHTML = 'Send Invitation <i class="fa-solid fa-paper-plane ms-2"></i>';
      
      const tempItems = workspaceList.querySelectorAll('.sim-temp-item');
      tempItems.forEach((el: any) => el.remove());
      
      if (toast) {
        gsap.set(toast, { y: 50, opacity: 0 });
      }
    };

    // Auto-looping GSAP timeline for simulating user activity
    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: '.admin-simulator-section',
        scroller: '.content-area',
        start: 'top 75%',
        toggleActions: 'play none none none',
        invalidateOnRefresh: true
      },
      repeat: -1,
      repeatDelay: 5
    });

    const targetEmail = 'alex.rivera@devtrack.io';
    const emailObj = { val: '' };

    // Step 1: Type the email address
    tl.to(emailObj, {
      duration: 1.6,
      val: targetEmail,
      ease: 'none',
      onUpdate: () => {
        emailInput.value = emailObj.val;
      }
    });

    // Step 2: Enable button and click it
    tl.call(() => {
      inviteBtn.disabled = false;
    });

    tl.to(inviteBtn, { scale: 0.95, duration: 0.12, yoyo: true, repeat: 1, ease: 'power1.inOut' }, '+=0.2');

    tl.call(() => {
      inviteBtn.disabled = true;
      inviteBtn.innerHTML = 'Inviting... <i class="fa-solid fa-spinner fa-spin ms-2"></i>';
    });

    // Step 3: Insert Pending Member Row
    tl.call(() => {
      const newItem = document.createElement('div');
      newItem.className = 'sim-member-item pending sim-temp-item';
      newItem.innerHTML = `
        <div class="member-av">AR</div>
        <div class="member-info">
          <strong>Alex Rivera</strong>
          <span>alex.rivera@devtrack.io</span>
        </div>
        <div class="member-status-col">
          <span class="status-badge pending">Pending Invite</span>
        </div>
      `;
      workspaceList.appendChild(newItem);

      gsap.fromTo(newItem,
        { height: 0, opacity: 0, scale: 0.95, transformOrigin: 'top center' },
        { height: 'auto', opacity: 1, scale: 1, duration: 0.45, ease: 'power3.out' }
      );
    }, undefined, '+=0.5');

    // Step 4: Graduate to Active Member with Permission Badges
    tl.call(() => {
      const pendingItem = workspaceList.querySelector('.sim-member-item.pending');
      if (pendingItem) {
        pendingItem.classList.remove('pending');
        pendingItem.classList.add('active');
        const badgeCol = pendingItem.querySelector('.member-status-col');
        if (badgeCol) {
          badgeCol.innerHTML = `
            <span class="status-badge active">Active Member</span>
            <span class="permission-badge">Can Manage Projects</span>
          `;
          
          gsap.from(badgeCol.querySelectorAll('span'), {
            opacity: 0,
            x: 8,
            duration: 0.35,
            stagger: 0.12,
            ease: 'power2.out'
          });
        }
      }

      // Trigger Toast notification
      if (toast) {
        gsap.timeline()
          .fromTo(toast, { y: 40, opacity: 0 }, { y: 0, opacity: 1, duration: 0.4, ease: 'back.out(1.5)' })
          .to(toast, { y: -20, opacity: 0, duration: 0.35, ease: 'power2.in' }, '+=2.5');
      }
    }, undefined, '+=1.6');

    // Step 5: Tear down temporary items before looping
    tl.call(() => {
      const tempItems = workspaceList.querySelectorAll('.sim-temp-item');
      gsap.to(tempItems, {
        opacity: 0,
        height: 0,
        scale: 0.95,
        duration: 0.4,
        ease: 'power2.in',
        onComplete: resetSim
      });
    }, undefined, '+=3.8');
  }

  // ── FAQ Accordion ────────────────────────────────────────────────────────

  toggleFaq(index: number, event: Event) {
    const btn = event.currentTarget as HTMLElement;
    const item = btn.closest('.faq-item');
    if (!item) return;

    const answer = item.querySelector('.faq-answer') as HTMLElement;
    const icon = item.querySelector('.faq-icon i') as HTMLElement;
    if (!answer) return;

    const isOpen = item.classList.contains('active');

    // Close any other active accordion items
    const allItems = this.el.nativeElement.querySelectorAll('.faq-item');
    allItems.forEach((el: HTMLElement) => {
      if (el !== item && el.classList.contains('active')) {
        el.classList.remove('active');
        const ans = el.querySelector('.faq-answer') as HTMLElement;
        const ic = el.querySelector('.faq-icon i') as HTMLElement;
        if (ans) {
          gsap.to(ans, { height: 0, opacity: 0, duration: 0.3, ease: 'power2.inOut' });
        }
        if (ic) {
          gsap.to(ic, { rotate: 0, duration: 0.25 });
        }
      }
    });

    if (isOpen) {
      item.classList.remove('active');
      gsap.to(answer, { height: 0, opacity: 0, duration: 0.3, ease: 'power2.inOut' });
      if (icon) gsap.to(icon, { rotate: 0, duration: 0.25 });
    } else {
      item.classList.add('active');
      
      // Compute actual content height
      gsap.set(answer, { height: 'auto', opacity: 1 });
      const targetHeight = answer.scrollHeight;
      
      gsap.fromTo(answer,
        { height: 0, opacity: 0 },
        { height: targetHeight, opacity: 1, duration: 0.4, ease: 'power3.out', clearProps: 'height' }
      );
      if (icon) gsap.to(icon, { rotate: 45, duration: 0.25 });
    }
  }

  initStickyShowcase() {
    const panels = this.el.nativeElement.querySelectorAll('.feature-panel');
    if (!panels.length) return;

    const activate = (index: number) => {
      const screens = this.el.nativeElement.querySelectorAll('.showcase-screen');
      const tabs = this.el.nativeElement.querySelectorAll('.sw-tab');
      const dots = this.el.nativeElement.querySelectorAll('.sw-dot');

      screens.forEach((s: any) => {
        s.classList.remove('active');
        gsap.killTweensOf(s);
      });
      tabs.forEach((t: any) => t.classList.remove('active'));
      dots.forEach((d: any) => d.classList.remove('active'));

      const screen = this.el.nativeElement.querySelector(`#sw-screen-${index}`);
      if (screen) {
        screen.classList.add('active');
        gsap.fromTo(screen,
          { opacity: 0, y: 15, scale: 0.98 },
          { opacity: 1, y: 0, scale: 1, duration: 0.45, ease: 'power2.out' }
        );
      }
      
      const tab = this.el.nativeElement.querySelector(`#sw-tab-${index}`);
      if (tab) tab.classList.add('active');
      
      const dot = this.el.nativeElement.querySelector(`.sw-dot[data-i="${index}"]`);
      if (dot) dot.classList.add('active');
    };

    // Add manual click listeners to tabs and dots for enhanced mobile/desktop usability
    const tabs = this.el.nativeElement.querySelectorAll('.sw-tab');
    tabs.forEach((tab: any, idx: number) => {
      this.renderer.listen(tab, 'click', () => activate(idx));
    });

    const dots = this.el.nativeElement.querySelectorAll('.sw-dot');
    dots.forEach((dot: any, idx: number) => {
      this.renderer.listen(dot, 'click', () => activate(idx));
    });

    // ── Desktop (min-width: 992px) Responsive GSAP Pinning & Timeline ──
    this.mm.add("(min-width: 992px)", () => {
      // ScrollTrigger screen swap triggers
      panels.forEach((panel: any, i: number) => {
        ScrollTrigger.create({
          trigger: panel,
          scroller: '.content-area',
          start: 'top 50%',
          end: 'bottom 50%',
          onEnter: () => activate(i),
          onEnterBack: () => activate(i),
          invalidateOnRefresh: true
        });

        const content = panel.querySelector('.panel-content');
        if (content) {
          gsap.from(content, {
            scrollTrigger: {
              trigger: panel,
              scroller: '.content-area',
              start: 'top 75%',
              toggleActions: 'play none none reverse',
              invalidateOnRefresh: true
            },
            y: 50,
            opacity: 0,
            duration: 0.8,
            ease: 'power3.out',
          });
        }
      });

      const inner = this.el.nativeElement.querySelector('.showcase-inner');
      const visualCol = this.el.nativeElement.querySelector('.showcase-visual-col');
      if (inner && visualCol) {
        ScrollTrigger.create({
          trigger: inner,
          scroller: '.content-area',
          start: 'top top',
          end: 'bottom bottom',
          pin: visualCol,
          pinSpacing: true,
          invalidateOnRefresh: true
        });
      }
    });

    // ── Mobile/Tablet (max-width: 991px) Clean Degradation ──
    this.mm.add("(max-width: 991px)", () => {
      panels.forEach((panel: any) => {
        const content = panel.querySelector('.panel-content');
        if (content) {
          gsap.set(content, { clearProps: "all" });
        }
      });
      this.el.nativeElement.querySelectorAll('.showcase-screen').forEach((s: any) => {
        gsap.set(s, { clearProps: "all" });
      });
      activate(0);
    });
  }

  initSpotlightEffect() {
    if (this.isMobile) return;

    const container = this.el.nativeElement.querySelector('.mockup-body-wrapper');
    if (!container) return;

    this.ngZone.runOutsideAngular(() => {
      this.pointerMoveListener = this.renderer.listen(container, 'pointermove', (e: PointerEvent) => {
        const rect = container.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        container.style.setProperty('--x', `${x}px`);
        container.style.setProperty('--y', `${y}px`);
      });
    });
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
        if (window.innerWidth <= 991) return;

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
        if (window.innerWidth <= 991) return;

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

    // TASK 3: Scroll-Triggered Reveals - Responsive setup
    this.mm.add("(min-width: 992px)", () => {
      // Abstract elements generic reveal
      const revealElements = q('.gsap-reveal');
      revealElements.forEach((el: any) => {
        gsap.from(el, {
          scrollTrigger: {
            trigger: el,
            scroller: '.content-area',
            start: 'top 85%',
            toggleActions: 'play none none reverse',
            invalidateOnRefresh: true
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
            invalidateOnRefresh: true
          },
          y: 60,
          scale: 0.9,
          opacity: 0,
          duration: 1,
          stagger: 0.15,
          ease: 'back.out(1.2)'
        });
      }
    });

    this.mm.add("(max-width: 991px)", () => {
      const revealElements = q('.gsap-reveal');
      revealElements.forEach((el: any) => {
        gsap.set(el, { clearProps: "all" });
      });

      const cards = q('.feature-card');
      cards.forEach((card: any) => {
        gsap.set(card, { clearProps: "all" });
      });

      if (mockupFrame) {
        gsap.set(mockupFrame, { clearProps: "all" });
      }
    });
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

  navigateToPrivacy() {
    this.router.navigate(['home/privacy-policy'])
  }

  // ── Reactive Navbar ──────────────────────────────────────────────────────

  initReactiveNavbar() {
    const navContainer = document.querySelector('.glass-nav .nav-container') as HTMLElement;
    if (!navContainer) return;

    // Start fully transparent on the landing page
    gsap.set(navContainer, {
      background: 'transparent',
      borderColor: 'transparent',
      boxShadow: 'none',
    });

    const scroller = document.querySelector('.content-area');
    if (!scroller) return;

    const onScroll = () => {
      const scrolled = scroller.scrollTop > 48;
      if (scrolled) {
        gsap.to(navContainer, {
          background: 'rgba(10, 11, 16, 0.92)',
          borderColor: 'rgba(28, 31, 38, 1)',
          boxShadow:
            '0 8px 32px rgba(0,0,0,0.55), 0 0 20px rgba(0,242,254,0.025), inset 0 1px 0 rgba(255,255,255,0.02)',
          duration: 0.4,
          ease: 'power2.out',
          overwrite: 'auto',
        });
      } else {
        gsap.to(navContainer, {
          background: 'transparent',
          borderColor: 'transparent',
          boxShadow: 'none',
          duration: 0.4,
          ease: 'power2.out',
          overwrite: 'auto',
        });
      }
    };

    this.navScrollHandler = onScroll;
    scroller.addEventListener('scroll', onScroll, { passive: true });
  }

  // ── Bento Spotlight ──────────────────────────────────────────────────────

  initBentoSpotlight() {
    const section = this.el.nativeElement.querySelector('.bento-section') as HTMLElement;
    const spotlight = this.el.nativeElement.querySelector('#bento-spotlight') as HTMLElement;
    if (!section || !spotlight) return;

    this.bentoSectionEl = section;
    gsap.set(spotlight, { opacity: 0 });

    this.bentoMouseMoveHandler = (e: MouseEvent) => {
      const rect = section.getBoundingClientRect();
      gsap.to(spotlight, {
        left: e.clientX - rect.left,
        top: e.clientY - rect.top,
        duration: 0.85,
        ease: 'power2.out',
        overwrite: 'auto',
      });
    };

    this.bentoMouseEnterHandler = () => {
      gsap.to(spotlight, { opacity: 1, duration: 0.4 });
    };

    this.bentoMouseLeaveHandler = () => {
      gsap.to(spotlight, { opacity: 0, duration: 0.4 });
    };

    section.addEventListener('mousemove', this.bentoMouseMoveHandler);
    section.addEventListener('mouseenter', this.bentoMouseEnterHandler);
    section.addEventListener('mouseleave', this.bentoMouseLeaveHandler);
  }

  // TASK 3: Strict Memory Management
  ngOnDestroy() {
    const heroSection = this.el.nativeElement.querySelector('.hero-section');

    // Clean up hero listeners
    if (heroSection) {
      if (this.mouseMoveHandler) heroSection.removeEventListener('mousemove', this.mouseMoveHandler);
      if (this.mouseLeaveHandler) heroSection.removeEventListener('mouseleave', this.mouseLeaveHandler);
    }

    // Unsubscribe Renderer2 spotlight listeners
    if (this.pointerMoveListener) this.pointerMoveListener();

    // Clean up bento spotlight listeners
    if (this.bentoSectionEl) {
      if (this.bentoMouseMoveHandler) this.bentoSectionEl.removeEventListener('mousemove', this.bentoMouseMoveHandler);
      if (this.bentoMouseEnterHandler) this.bentoSectionEl.removeEventListener('mouseenter', this.bentoMouseEnterHandler);
      if (this.bentoMouseLeaveHandler) this.bentoSectionEl.removeEventListener('mouseleave', this.bentoMouseLeaveHandler);
    }

    // Clean up navbar scroll listener
    const scroller = document.querySelector('.content-area');
    if (scroller && this.navScrollHandler) {
      scroller.removeEventListener('scroll', this.navScrollHandler);
    }

    // Revert matchMedia context
    this.mm.revert();

    // Kill all GSAP tweens and ScrollTriggers
    ScrollTrigger.getAll().forEach(trigger => trigger.kill());
    gsap.killTweensOf(this.el.nativeElement.querySelectorAll('*'));

    // Restore navbar to default glass state on leaving landing page
    const navContainer = document.querySelector('.glass-nav .nav-container') as HTMLElement;
    if (navContainer) {
      gsap.set(navContainer, {
        clearProps: 'background,borderColor,boxShadow',
      });
    }
  }
}