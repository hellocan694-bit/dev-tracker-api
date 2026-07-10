import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { ProjectService } from 'src/app/core/services/project.service';
import { ProjectResponse } from 'src/app/shared/interfaces/ProjectResponse';
import Swal from 'sweetalert2';
// FIX #4 — Memory Leak: import Subject and takeUntil for subscription cleanup
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

@Component({
  selector: 'app-projects-list',
  templateUrl: './projects-list.component.html',
  styleUrls: ['./projects-list.component.scss'],
})
export class ProjectsListComponent implements OnInit, OnDestroy {
  constructor(
    private projectService: ProjectService,
    private toaster: ToastrService,
    private router: Router
  ) { }

  countHistoryProjects: number = 0;

  // Pagination State
  currentPage: number = 1;
  pageSize: number = 10;

  /**
   * FIX #4 — Memory Leak resolved.
   * destroy$ acts as the single unsubscribe signal for all long-lived
   * subscriptions in this component. Calling next()+complete() in
   * ngOnDestroy() automatically terminates all piped takeUntil subscriptions.
   */
  private readonly destroy$ = new Subject<void>();

  get totalPages(): number {
    return Math.ceil(this.countProjects / this.pageSize) || 1;
  }

  get pages(): number[] {
    return Array.from({ length: this.totalPages }, (_, i) => i + 1);
  }

  ngOnInit(): void {
    this.getAllActiveProject();

    // FIX #4: historyCount$ subscription now cleans up automatically on destroy
    this.projectService.historyCount$.pipe(
      takeUntil(this.destroy$)
    ).subscribe(count => {
      this.countHistoryProjects = count;
    });
  }

  ngOnDestroy(): void {
    // Signal all takeUntil subscriptions to complete
    this.destroy$.next();
    this.destroy$.complete();
  }

  projects: any[] = [];
  countProjects: number = 0;
  isLoading: boolean = false;
  developerName = localStorage.getItem('userName');

  getAllActiveProject() {
    this.isLoading = true;

    this.projectService.getAllProjects(this.currentPage, this.pageSize).subscribe({
      next: (res: ProjectResponse) => {
        const projectsList = Array.isArray(res.Projects)
          ? res.Projects
          : (res.Projects && Array.isArray((res.Projects as any).projects) ? (res.Projects as any).projects : []);
        this.projects = projectsList;

        this.countProjects = typeof res.total === 'number'
          ? res.total
          : (res.Projects && typeof (res.Projects as any).totalActiveProjects === 'number' ? (res.Projects as any).totalActiveProjects : 0);

        this.isLoading = false;
      },
      error: (err) => {
        this.isLoading = false;
        this.projects = [];
        this.toaster.error("Failed to load projects");
        console.error(err);
      },
    });
  }

  onPageChange(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
      this.getAllActiveProject();
    }
  }

  confirmComplete(project: any) {
    Swal.fire({
      title: 'Mission Accomplished?',
      text: `Are you sure you want to mark "${project.name}" as completed?`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#10b981',
      cancelButtonColor: '#1a1a1a',
      confirmButtonText: 'Yes, I\'m done!',
      cancelButtonText: 'Not yet',
      background: '#121212',
      color: '#ffffff',
      iconColor: '#10b981',
      backdrop: `rgba(0,0,0,0.8)`
    }).then((result) => {
      if (result.isConfirmed) {
        this.markAsComplete(project._id);
      }
    });
  }

  trackByProjectId(index: number, project: any): string {
    return project._id;
  }

  markAsComplete(_id: string) {
    this.projectService.completeProject(_id).subscribe({
      next: (res: any) => {
        // FIX (Audit Issue #19): Toast now fires INSIDE the success callback,
        // not before the API responds — preventing false success messages on failure.
        this.projects = this.projects.filter(
          (p: { _id: string }) => p._id !== _id
        );
        this.countProjects--;
        this.getAllActiveProject();

        const Toast = Swal.mixin({
          toast: true,
          position: 'bottom-end',
          showConfirmButton: false,
          timer: 2500,
          background: '#10b981',
          color: '#fff',
          iconColor: '#fff'
        });
        Toast.fire({
          icon: 'success',
          title: 'Project has been moved to history.'
        });
        this.router.navigate(['home/completedprojects']);
      },
      error: (err) => {
        this.toaster.error(err.error.message);
      },
    });
  
    this.router.navigate(['home/completedprojects'])
  }
}
