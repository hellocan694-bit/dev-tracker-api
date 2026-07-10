import { Component, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { AuthService } from 'src/app/core/services/auth.service';
import { Router } from '@angular/router';
import Swal from 'sweetalert2';
import { Subject, takeUntil } from 'rxjs';

@Component({
  selector: 'app-updatepassword',
  templateUrl: './updatepassword.component.html',
  styleUrls: ['./updatepassword.component.scss']
})
export class UpdatepasswordComponent implements OnDestroy {
  formData: FormGroup;
  isLoading = false;
  private destroy$ = new Subject<void>(); // للأمان عشان ميبقاش فيه Memory Leak

  constructor(
    private authService: AuthService,
    private fb: FormBuilder,
    private router: Router
  ) {
this.formData = this.fb.group({
  email: ['', [Validators.required, Validators.email]],
  otp: ['', [Validators.required, Validators.pattern('^[0-9]{6}$')]],
  newPassword: ['', [Validators.required, Validators.minLength(8)]]
});// Custom validator للتأكيد
  }

  // ميثود للتأكد إن الباسورد متطابق
  passwordMatchValidator(g: FormGroup) {
    return g.get('newPassword')?.value === g.get('confirmPassword')?.value
      ? null : { mismatch: true };
  }

  changePassword() {
    if (this.formData.invalid) {
      this.formData.markAllAsTouched();
      return;
    }

    this.isLoading = true;
    const { email, otp, newPassword } = this.formData.value;

    this.authService.updatePassword(email, otp, newPassword)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res: any) => {
          this.isLoading = false;
          this.showSuccessAlert(res.message || 'Password updated successfully!');
        },
        error: (err: any) => {
          this.isLoading = false;
          this.showErrorAlert(err.error?.message || 'Invalid OTP or session expired.');
        }
      });
  }

  // --- Alerts (بنفس الـ Style اللي بتحبه) ---
  private showSuccessAlert(msg: string) {
    Swal.fire({
      title: 'Success!',
      text: msg,
      icon: 'success',
      confirmButtonColor: '#10b981',
      background: '#121212',
      color: '#ffffff',
      timer: 3000
    }).then(() => this.router.navigate(['/login']));
  }

  private showErrorAlert(msg: string) {
    Swal.fire({
      title: 'Error!',
      text: msg,
      icon: 'error',
      confirmButtonColor: '#ef4444',
      background: '#121212',
      color: '#ffffff'
    });
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }
}