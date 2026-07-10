import { Component, OnInit, NgZone } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { AuthService } from 'src/app/core/services/auth.service';
import { SocketService } from 'src/app/core/services/socket.service';
import { GithubCallbackComponent } from 'src/app/shared/github-callback/github-callback.component';
import * as AOS from 'aos';
import { environment } from 'src/environment/environment';

// تعريف مكتبة جوجل العالمية
declare var google: any;

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',

  styleUrls: ['./login.component.scss']
})
export class LoginComponent implements OnInit {
  formData: FormGroup;
  isLoading = false;

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private fb: FormBuilder,
    private authservice: AuthService,
    private toaster: ToastrService,
    private socketService: SocketService,
    private ngZone: NgZone // ضروري جداً للتحويل بعد الـ Callback
  ) {
    this.formData = this.fb.group({
      email: ['', [
        Validators.required,
        Validators.email,
        Validators.pattern(/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/)
      ]],
      password: ['', [Validators.required, Validators.minLength(8)]]
    });
  }

  triggerGoogleLogin() {
    // بنروح ندور على الزرار المستخبي ونخليه يتضغط أوتوماتيك
    const googleInternalBtn = document.querySelector('#google-btn-hidden div[role="button"]') as HTMLElement;
    if (googleInternalBtn) {
      googleInternalBtn.click();
    }
  }
  ngOnInit(): void {
    AOS.init({ once: true, duration: 800 });

    // GitHub OAuth callback: token is in the HttpOnly cookie set by the backend.
    // Only the developer profile is passed in query params (no token in URL).
    this.route.queryParams.subscribe(params => {
      const userStr = params['user'];
      if (userStr) {
        try {
          const user = JSON.parse(decodeURIComponent(userStr));
          this.ngZone.run(() => {
            this.processAuthResponse({ developer: user, message: 'Logged in with GitHub successfully' });
          });
        } catch (e) {
          console.error('Error parsing user data from redirect', e);
        }
      }
    });

    // التأكد من تحميل مكتبة جوجل قبل البدء
    this.waitForGoogle();
  }

  waitForGoogle() {
    const checkGoogle = setInterval(() => {
      if (typeof google !== 'undefined') {
        this.initializeGoogleLogin();
        clearInterval(checkGoogle);
      }
    }, 500);
  }

  initializeGoogleLogin() {
    google.accounts.id.initialize({
      client_id: '1062197451507-botmlit3iea3ioeqogfll877e6vjs6ia.apps.googleusercontent.com',
      callback: (response: any) => {
        // الـ NgZone بتخلي الـ Angular يحس بالـ Response اللي جاي من جوجل
        this.ngZone.run(() => {
          this.handleGoogleLogin(response);
        });
      }
    });

    google.accounts.id.renderButton(
      document.getElementById('google-btn'),
      {
        theme: 'outline',
        size: 'large',
        width: 240,
        text: 'signin_with',
        shape: 'rectangular'
      }
    );
  }

  handleGoogleLogin(response: any) {
    this.isLoading = true;
    // إرسال الـ Token للـ Backend
    this.authservice.googleLogin(response.credential).subscribe({
      next: (res: any) => {
        this.processAuthResponse(res);
      },
      error: (err) => {
        this.toaster.error(err.error?.message || 'Google Login failed');
        this.isLoading = false;
      }
    });
  }

  // login.component.ts
  loginWithGithub() {
    const clientId = 'Ov23li8O7Mzc2lmnXluy';

    // ثبتنا الرابط هنا مباشرة عشان نضمن إنه يطابق إعدادات جيت هاب بالظبط
    const redirectUri = encodeURIComponent('https://dev-tracker-production-3ef3.up.railway.app/auth/github/callback');
    const scope = 'read:user user:email';
    const state = 'login'; // نحدد الحالة كـ login عشان الـ backend يعرف يفرق

    const githubUrl = `https://github.com/login/oauth/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&scope=${scope}&state=${state}`;
    window.location.href = githubUrl;
  }

  login() {
    if (this.formData.valid) {
      this.isLoading = true;
      const { email, password } = this.formData.value;

      this.authservice.login(email, password).subscribe({
        next: (res: any) => {
          this.processAuthResponse(res);
        },
        error: (err) => {
          const errorMsg = err.error?.message || 'Login failed. Please check your credentials.';
          this.toaster.error(errorMsg);
          this.isLoading = false;
        }
      });
    } else {
      this.formData.markAllAsTouched();
    }
  }


  private processAuthResponse(res: any) {
    // Explicitly update auth service state.
    // For email/Google logins this is already done by handleAuthSuccess() via tap(),
    // but for the GitHub redirect flow the response comes from a URL param (not an
    // HTTP observable), so we must call it manually here too.
    // markLoggedIn() is idempotent — calling it twice is safe.
    if (res.developer) {
      this.authservice.markLoggedIn(res.developer);
      // Extra fields used by legacy parts of the app
      localStorage.setItem('email', res.developer.email);
      localStorage.setItem('userId', res.developer.id || res.developer._id);
    }

    // Connect socket (uses withCredentials, so the cookie is forwarded automatically)
    this.socketService.connect();

    this.toaster.success(res.message || 'Logged in successfully');

    this.ngZone.run(() => {
      this.router.navigate(['home/masterhome']);
    });

    this.isLoading = false;
  }

  gotoForgetPassword() {
    this.router.navigate(['auth/emailtochangepassword']);
  }

  gotoLearnAboutUs() {
    this.router.navigate(['auth/learnaboutus']);
  }
}