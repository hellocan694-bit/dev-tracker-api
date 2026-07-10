import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GithubRoutingModule } from './github-routing.module';
import { FormsModule } from '@angular/forms';
import { GitHubDashboardComponent } from './pages/github-dashboard/github-dashboard.component';
import { GitHubSuccessComponent } from './pages/github-success/github-success.component';
import { GithubLayoutComponent } from './pages/github-layout/github-layout.component';

@NgModule({
  declarations: [],
  imports: [
    CommonModule,
    FormsModule,
    GithubRoutingModule,
    // Standalone components
    GithubLayoutComponent,
    GitHubDashboardComponent,
    GitHubSuccessComponent
  ]
})
export class GithubModule { }
