import { Component, OnInit } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { Router } from '@angular/router';

@Component({
  selector: 'app-paymob-iframe',
  templateUrl: './paymob-iframe.component.html',
  styleUrls: ['./paymob-iframe.component.scss']
})
export class PaymobIframeComponent implements OnInit {
  iframeUrl: SafeResourceUrl | null = null;
  error: string | null = null;

  constructor(private sanitizer: DomSanitizer, private router: Router) {
    const navigation = this.router.getCurrentNavigation();
    const state = navigation?.extras.state as { iframeUrl: string };
    
    if (state && state.iframeUrl) {
      // Securely bypass Angular's security check for the iframe URL
      this.iframeUrl = this.sanitizer.bypassSecurityTrustResourceUrl(state.iframeUrl);
    } else {
      // Fallback if accessed directly without state
      this.error = "No active payment session found.";
    }
  }

  ngOnInit(): void {
    if (!this.iframeUrl) {
      setTimeout(() => {
        this.router.navigate(['/subscriptions/pricing']);
      }, 3000);
    }
  }
}
