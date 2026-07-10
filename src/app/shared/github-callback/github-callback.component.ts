import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from 'src/app/core/services/auth.service';

@Component({
  selector: 'app-github-callback',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="callback-container">
      <div class="loader-orb"></div>
      <p>Authenticating with GitHub...</p>
    </div>
  `,
  styles: [`
    .callback-container {
      height: 100vh;
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      background: #0d1117;
      color: #c9d1d9;
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
    }
    .loader-orb {
      width: 50px;
      height: 50px;
      border: 3px solid rgba(59, 130, 246, 0.1);
      border-top-color: #3b82f6;
      border-radius: 50%;
      animation: spin 1s linear infinite;
      margin-bottom: 20px;
    }
    @keyframes spin { to { transform: rotate(360deg); } }
  `]
})
export class GithubCallbackComponent implements OnInit {
  constructor(
    private route: ActivatedRoute,
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit() {
    this.route.queryParams.subscribe(params => {
      const code = params['code'];
      if (code) {
        this.authService.githubLogin(code).subscribe({
          next: (res) => {
            // أنت مستخدم NgZone في الـ Component الأساسي، 
            // الـ Service عندك بتعمل handleAuthSuccess فالدنيا تمام
            this.router.navigate(['home/masterhome']);
          },
          error: (err) => {
            console.error('GitHub Auth Error:', err);
            this.router.navigate(['/auth/login']);
          }
        });
      } else {  
        this.router.navigate(['/auth/login']);
      }
    });
  }
}