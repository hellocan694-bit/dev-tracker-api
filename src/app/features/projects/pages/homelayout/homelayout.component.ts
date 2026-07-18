import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router, NavigationEnd, RouterOutlet } from '@angular/router';
import { CommonModule } from '@angular/common';
import { filter, Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { FooterComponent } from 'src/app/shared/components/footer/footer.component';
import { NavbarComponent } from 'src/app/shared/components/navbar/navbar.component';
import { SidebarComponent } from "src/app/shared/components/sidebar/sidebar.component";

@Component({
  selector: 'app-homelayout',
  standalone: true,
  imports: [CommonModule, NavbarComponent, RouterOutlet, SidebarComponent, FooterComponent],
  templateUrl: './homelayout.component.html',
  styleUrls: ['./homelayout.component.scss']
})
export class HomelayoutComponent implements OnInit, OnDestroy {
  showSidebar = true;
  /** Single destroy signal — all takeUntil subscriptions complete automatically. */
  private readonly destroy$ = new Subject<void>();

  constructor(private router: Router) {
    this.checkRoute(this.router.url);
  }

  ngOnInit() {
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd),
      takeUntil(this.destroy$)
    ).subscribe((event: any) => {
      this.checkRoute(event.urlAfterRedirects);
    });
  }

  checkRoute(url: string) {
    // Hide sidebar on the guest home page and privacy policy page
    this.showSidebar = !url.includes('/guesthomepage') && !url.includes('/privacy-policy');
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
