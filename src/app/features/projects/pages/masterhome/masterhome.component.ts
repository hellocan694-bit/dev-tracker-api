import { Component, OnInit, ChangeDetectionStrategy, ChangeDetectorRef, AfterViewInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { ProjectService } from 'src/app/core/services/project.service';
import { TaskService } from 'src/app/core/services/task.service';
import { FeatureTourService } from 'src/app/core/services/feature-tour.service';
import { Project } from 'src/app/shared/interfaces/project';
import { ProjectResponse } from 'src/app/shared/interfaces/ProjectResponse';
import { NgxChartsModule } from '@swimlane/ngx-charts';
import { FeatureTourComponent } from 'src/app/shared/components/feature-tour/feature-tour.component';
import { gsap } from 'gsap';
// FIX #4 — Memory Leak: import Subject and takeUntil for subscription cleanup
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

@Component({
  selector: 'app-masterhome',
  standalone: true,
  imports: [CommonModule, RouterModule, NgxChartsModule, FeatureTourComponent],
  templateUrl: './masterhome.component.html',
  styleUrls: ['./masterhome.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class MasterhomeComponent implements OnInit, AfterViewInit, OnDestroy {
  projects: Project[] = [];
  isLoading: boolean = false;
  weeklyHours: number = 0;
  countProjects: number = 0;
  countHistoryProjects: number = 0;
  developerName = localStorage.getItem('userName');
  chartData: any[] = [];
  colorScheme: any = { domain: ['#00f0ff'] };

  private ctx!: gsap.Context;

  /**
   * FIX #4 — Memory Leak resolved.
   * A single Subject acts as a "destroy signal". Every subscription that
   * pipes through takeUntil(this.destroy$) will automatically complete
   * when this.destroy$.next() is called in ngOnDestroy — no manual
   * unsubscribe() bookkeeping required.
   */
  private readonly destroy$ = new Subject<void>();

  constructor(
    private projectService: ProjectService,
    private taskService: TaskService,
    private toaster: ToastrService,
    private router: Router,
    private cdr: ChangeDetectorRef,
    private featureTourService: FeatureTourService
  ) {}

  ngOnInit() {
    this.getUnarchivedProjects();
    this.loadWeeklyStats();
    this.loadStats();

    // FIX #4: historyCount$ is now properly cleaned up on component destroy
    this.projectService.historyCount$.pipe(
      takeUntil(this.destroy$)
    ).subscribe(count => {
      this.countHistoryProjects = count;
      this.cdr.markForCheck();
      this.animateCounters('.counter-history', this.countHistoryProjects);
    });

    // Start feature tour for first-time users after DOM has settled
    if (this.featureTourService.isFirstTimeUser()) {
      setTimeout(() => this.featureTourService.startTour(), 1200);
    }
  }

  ngAfterViewInit() {
    this.ctx = gsap.context(() => {
      this.typewriter('.typewriter-text', `> System Status: Online. Welcome back, ${this.developerName}.`);

      gsap.to('.floating-icon', {
        y: -15,
        rotation: 5,
        duration: 3,
        yoyo: true,
        repeat: -1,
        ease: 'sine.inOut',
        stagger: {
          each: 0.3,
          from: 'random'
        }
      });
    });
  }

  ngOnDestroy() {
    // FIX #4: Signal all takeUntil subscriptions to complete, then clean up GSAP
    this.destroy$.next();
    this.destroy$.complete();
    if (this.ctx) this.ctx.revert();
  }

  loadWeeklyStats() {
    this.projectService.getWeeklyStats().subscribe({
      next: (response) => {
        if (response.success) {
          this.weeklyHours = response.data.totalHours;
          this.cdr.markForCheck();
          this.animateCounters('.counter-weekly', this.weeklyHours);
        }
      },
      error: (err) => console.error('Error fetching weekly stats', err)
    });
  }

  getUnarchivedProjects() {
    this.isLoading = true;
    this.cdr.markForCheck();
    this.projectService.getAllProjects(0).subscribe({
      next: (res: ProjectResponse) => {
        const projectsList = Array.isArray(res.Projects)
          ? res.Projects
          : (res.Projects && Array.isArray((res.Projects as any).projects) ? (res.Projects as any).projects : []);
        this.projects = projectsList.slice(0, 3);
        this.countProjects = typeof res.total === 'number'
          ? res.total
          : (res.Projects && typeof (res.Projects as any).totalActiveProjects === 'number' ? (res.Projects as any).totalActiveProjects : 0);
        this.isLoading = false;
        this.cdr.markForCheck();
        this.animateCounters('.counter-projects', this.countProjects);
      },
      error: (err) => {
        this.isLoading = false;
        this.cdr.markForCheck();
        console.error('Error fetching projects:', err);
      }
    });
  }

  loadStats(): void {
    this.taskService.getWeeklyStats().subscribe({
      next: (data) => {
        this.chartData = data;
        this.cdr.markForCheck();
      },
      error: (err) => console.error('Error fetching productivity stats:', err)
    });
  }

  private animateCounters(selector: string, endValue: number) {
    setTimeout(() => {
        const el = document.querySelector(selector);
        if(el) {
           const obj = { val: 0 };
           gsap.to(obj, {
              val: endValue,
              duration: 2,
              ease: "power3.out",
              onUpdate: () => {
                  el.innerHTML = Math.floor(obj.val).toString();
              }
           });
        }
    }, 100);
  }

  private typewriter(elementSelector: string, text: string) {
    const el = document.querySelector(elementSelector);
    if (!el) return;
    el.innerHTML = '';
    const chars = text.split('');
    chars.forEach((c) => {
      const span = document.createElement('span');
      span.textContent = c;
      if(c === ' ') { span.innerHTML = '&nbsp;'; }
      span.style.opacity = '0';
      el.appendChild(span);
    });
    gsap.to(`${elementSelector} span`, {
      opacity: 1,
      duration: 0.05,
      stagger: 0.03,
      ease: 'none'
    });
  }

  startTour(): void {
    this.featureTourService.restartTour();
  }

  gotoCreate() {
    this.router.navigate(['home/createproject']);
  }

  gotoToActive() {
    this.router.navigate(['home/activeprojects']);
  }
}

