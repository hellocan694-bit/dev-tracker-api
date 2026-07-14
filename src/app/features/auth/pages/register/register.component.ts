import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import * as AOS from 'aos';
import { AuthService } from 'src/app/core/services/auth.service';

@Component({
  selector: 'app-register',
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.scss'],
})
export class RegisterComponent implements OnInit {
  formData: FormGroup;
  token: string | undefined;
  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router,
    private toast: ToastrService
  ) {
    this.formData = fb.group({
      name: ['', [Validators.required, Validators.minLength(3)]],
      email: [
        '',
        [
          Validators.required,
          Validators.email,
          Validators.pattern(/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/),
        ],
      ],
      password: ['', [Validators.required, Validators.minLength(8)]],
    });
  }

  isLoading = false;
  errorMessage: string | null = null;

  ngOnInit(): void {
    AOS.init({ once: true, duration: 800 });
  }

  developerRegister = () => {
    if (this.formData.valid) {
      const { name, email, password } = this.formData.value;
      this.authService.register(name, email, password).subscribe({
        next: (res: any) => {

          this.toast.success(res.otpMessage);
          this.router.navigate(['auth/verifyEmail'], {
            state: { token: res.token }
          });
        },
        error: (err) => {
          this.isLoading = false;
          const errorMessage = err.error?.message
          this.toast.error(errorMessage);
        },
      });
    }
  };
}
