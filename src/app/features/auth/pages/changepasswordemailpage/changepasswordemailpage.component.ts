import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from 'src/app/core/services/auth.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-changepasswordemailpage',
  templateUrl: './changepasswordemailpage.component.html',
  styleUrls: ['./changepasswordemailpage.component.scss']
})
export class ChangepasswordemailpageComponent {
  formData: FormGroup;

  constructor(private authService: AuthService, fb: FormBuilder , private router:Router) {
    this.formData = fb.group({
      email: ['', [Validators.required, Validators.email]] 
    })
  }

  sendOtp() {
    if (this.formData.valid) {
      const email = this.formData.value.email;

      this.authService.sendEmail( email ).subscribe({
        next: (res: any) => {
          Swal.fire({
            title: 'OTP Sent!',
            text: res.message || 'If the email exists, an OTP was sent.',
            icon: 'success',
            confirmButtonColor: '#10b981',
            background: '#121212',
            color: '#ffffff',
            iconColor: '#10b981',
            backdrop: `rgba(0,0,0,0.8)`
          });
        },
        error: (err: any) => {
          Swal.fire({
            title: 'Error!',
            text: err.error?.message || 'Something went wrong.',
            icon: 'error',
            confirmButtonColor: '#10b981',
            background: '#121212',
            color: '#ffffff',
            iconColor: '#ef4444',
            backdrop: `rgba(0,0,0,0.8)`
          });
        },
        complete: () => {
          this.router.navigate(['auth/changepassword']);
        }
      })
    }
  }
}