import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { ProjectService } from 'src/app/core/services/project.service';
import { Project } from 'src/app/shared/interfaces/project';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-history',
  templateUrl: './history.component.html',
  styleUrls: ['./history.component.scss'],
})
export class HistoryComponent implements OnInit {
  projects: Project[] = [];
  countHistoryProjects:number = 0;
  constructor(
    private projectService: ProjectService,
    private router: Router,
    private toaster: ToastrService
  ) {}
  ngOnInit(): void {
    this.getCompleteProjects();
  }

  confirmClear() {
    Swal.fire({
      title: 'Are you sure?',
      text: 'This will permanently delete your entire project history!',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444', 
      cancelButtonColor: '#1a1a1a',
      confirmButtonText: 'Yes, clear it!',
      background: '#121212', 
      color: '#ffffff',
      iconColor: '#ef4444',
      customClass: {
        popup: 'border-1px-solid-333',
      },
    }).then((result) => {
      if (result.isConfirmed) {
        this.clearHistory();
      }
    });
  }

  clearHistory() {
    this.projectService.clearAllhistory().subscribe({
      next: (res: any) => {
        this.getCompleteProjects();
        Swal.fire({
          title: 'Cleared!',
          text: 'Your history has been deleted.',
          icon: 'success',
          background: '#121212',
          color: '#ffffff',
          confirmButtonColor: '#007bff',
        });
      },
      error: (err) => {
        console.log(err);
        this.toaster.error('Failed to clear history');
      },
    });
  }
  getCompleteProjects() {
    this.projectService.getCompletedProjects().subscribe({
      next: (res: any) => {
        this.projects = res.archivedProjects;
        this.countHistoryProjects = res.totalHistory
        this.projectService.updateHistoryCount(res.totalHistory);
      },
      error: (err) => {
        console.log(err);
      },
    });
  }

  deleteProjectFomHistory(projectId: string) {
    this.projectService.deleteOneProject(projectId).subscribe({
      next: (res) => {
        this.getCompleteProjects();
        const Toast = Swal.mixin({
          toast: true,
          position: 'bottom-end',
          showConfirmButton: false,
          timer: 2500,
          background: '#10b981', 
          color: '#fff',
          iconColor: '#fff',
        });

        Toast.fire({
          icon: 'success',
          title: 'Project has been moved from history.',
        });
      },
      error: (err) => {
          const Toast = Swal.mixin({
            toast: true,
            position: 'bottom-end',
            showConfirmButton: false,
            timer: 2500,
            background: '#cd0909', 
            color: '#fff',
            iconColor: '#fff'
          });
        
          Toast.fire({
            icon: 'error',
            title: err
          });
      },
    });
  }
}
