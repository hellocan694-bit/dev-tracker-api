import { NgModule } from '@angular/core';
import { OnboardingModalComponent } from './shared/components/onboarding-modal/onboarding-modal.component';
import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { ToastrModule } from 'ngx-toastr';
import { NgxChartsModule } from '@swimlane/ngx-charts';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { TruncatePipe } from './shared/pipes/truncate.pipe';
// FIX #3 — AuthRoutingModule eager import REMOVED.
// Auth routes are already lazy-loaded in app-routing.module.ts via:
//   { path: 'auth', loadChildren: () => import('./features/auth/auth.module') }
// Importing AuthRoutingModule here AND lazy-loading it caused the Angular
// router to register auth routes twice, causing unpredictable navigation.
import { HttpClientModule } from '@angular/common/http';
import { httpInterceptorProviders } from './core/interceptors/providers';
import { SidebarComponent } from './shared/components/sidebar/sidebar.component';
import { ErrorpageComponent } from './shared/components/errorpage/errorpage.component';


@NgModule({
  declarations: [
    AppComponent,
    TruncatePipe,
    ErrorpageComponent,



  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    // AuthRoutingModule — REMOVED (was causing duplicate route registration)
    HttpClientModule,
    NgxChartsModule,
    BrowserAnimationsModule,
    ToastrModule.forRoot({
      timeOut: 3000,
      positionClass: 'toast-bottom-right',
      preventDuplicates: true,
    }),
    OnboardingModalComponent,   // standalone component → lives in imports[]
  ],
  providers: [...httpInterceptorProviders],
  bootstrap: [AppComponent]
})
export class AppModule { }

