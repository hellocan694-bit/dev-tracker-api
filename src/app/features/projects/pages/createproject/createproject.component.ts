import { formatDate } from '@angular/common';
import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { ProjectService } from 'src/app/core/services/project.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-createproject',
  templateUrl: './createproject.component.html',
  styleUrls: ['./createproject.component.scss']
})
export class CreateprojectComponent {
formData: FormGroup; 

  constructor(
    private projectService: ProjectService,
    private router: Router,
    private fb: FormBuilder,
    private toaster: ToastrService
  ) {
    this.formData = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(3)]],
      clientName: ['', [Validators.required, Validators.minLength(3)]], 
      hourlyRate: ['', [Validators.required, Validators.min(1)]],
      description: ['', [Validators.required, Validators.maxLength(300)]], 
    });
  }

  createOneProject() {
    if (this.formData.valid) {
      const data = this.formData.value;
      this.projectService.createProject(data).subscribe({
        next: () => {
          this.router.navigate(['home/masterhome']); 
        },
        error: (err) => {
          this.toaster.error(err.error?.message || "Something went wrong");
        }
      });
    } else {
      this.formData.markAllAsTouched(); 
    }

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
      title: 'Project created successfully'
    });
  }

  goBack() {
    this.router.navigate(['home/masterhome']);
  }

}
