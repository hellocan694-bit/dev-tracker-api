import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from 'src/app/core/services/auth.service';

@Component({
  selector: 'app-payment-success',
  templateUrl: './payment-success.component.html',
  styleUrls: ['./payment-success.component.scss']
})
export class PaymentSuccessComponent implements OnInit {
  isVerifying = true;
  error: string | null = null;

  constructor(private authService: AuthService, private router: Router) {}

  ngOnInit(): void {
    // Attempt to hit the GET /auth/profile endpoint to refresh the local state
    // this.authService.getProfile().subscribe({
    //   next: (profile: any) => {
    //     this.isVerifying = false;
    //     // The new `isPremium` status should now be evaluated correctly the next time 
    //     // the user visits a premium route. You could optionally dispatch this to a global store
    //     console.log('Profile refreshed after payment:', profile);
    //   },
    //   error: (err) => {
    //     this.isVerifying = false;
    //     this.error = 'Payment successful, but we failed to immediately refresh your profile status. Please log back in if you encounter access issues.';
    //     console.error('Failed to sync profile', err);
    //   }
    // });
  }

  goToDashboard() {
    this.router.navigate(['/home']);
  }
}
