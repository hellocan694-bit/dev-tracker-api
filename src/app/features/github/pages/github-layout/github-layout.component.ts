import { Component, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { NavbarComponent } from 'src/app/shared/components/navbar/navbar.component';
import { SidebarComponent } from 'src/app/shared/components/sidebar/sidebar.component';
import { FooterComponent } from 'src/app/shared/components/footer/footer.component';
import { CommonModule } from '@angular/common';
import { ToastContainerComponent } from 'src/app/shared/components/toast-container/toast-container.component';

@Component({
  selector: 'app-github-layout',
  standalone: true,
  imports: [
    CommonModule,
    NavbarComponent,
    RouterOutlet,
    SidebarComponent,
    FooterComponent,
    ToastContainerComponent
  ],
  template: `
    <app-toast-container></app-toast-container>
    <div class="app-layout">
      <app-sidebar></app-sidebar>

      <div class="main-wrapper">
        <app-navbar></app-navbar>
        <main class="content-area">
          <router-outlet></router-outlet>
          <app-footer></app-footer>
        </main>
      </div>
    </div>
  `,
  styles: [`
    .app-layout {
      display: flex;
      width: 100vw;
      height: 100vh;
      overflow: hidden;
      background-color: #0a0e14;
    }

    .main-wrapper {
      display: flex;
      flex-direction: column;
      flex-grow: 1;
      min-width: 0;
      height: 100vh;
      overflow: hidden;
    }

    .content-area {
      flex-grow: 1;
      overflow-y: auto;
      overflow-x: hidden;
      position: relative;
      display: flex;
      flex-direction: column;
    }
  `]
})
export class GithubLayoutComponent implements OnInit {
  ngOnInit() {
    console.log('[GithubLayout] mounted — sidebar-slot forces 85px width');
  }
}