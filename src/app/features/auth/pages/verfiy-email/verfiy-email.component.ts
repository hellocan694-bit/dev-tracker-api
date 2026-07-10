import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { AuthService } from 'src/app/core/services/auth.service';
import { Developer } from 'src/app/shared/interfaces/developer';

@Component({
  selector: 'app-verfiy-email',
  templateUrl: './verfiy-email.component.html',
  styleUrls: ['./verfiy-email.component.scss']
})
export class VerfiyEmailComponent implements OnInit {
  formData: FormGroup;
  token: string | undefined;
  isLoading = false;

  constructor(
    private fb: FormBuilder,
    private authservice: AuthService,
    private toaster: ToastrService,
    private router: Router
  ) {
    this.formData = this.fb.group({
      otp: ['', [Validators.required, Validators.minLength(6)]]
    });

    const navigation = this.router.getCurrentNavigation();
    this.token = navigation?.extras.state?.['token'];
  }

  ngOnInit() {
    if (!this.token) {
      this.toaster.error('Verification session expired, please register again');
      this.router.navigate(['/auth/register']);
    }
  }

  createAccount = () => {
    if (this.formData.valid && this.token) {
      this.isLoading = true;

      const { otp } = this.formData.value;


      this.authservice.createAcc(otp, this.token).subscribe({
        next: (res:any) => {
          this.isLoading = false;
          this.toaster.success(res.message);
          this.router.navigate(['/auth/login']); 
        },
        error: (error) => {
          this.isLoading = false;
          const errorMessage = error.error?.message || "Invalid or expired OTP";
          this.toaster.error(errorMessage);
        }
      });
    }
  };
}
