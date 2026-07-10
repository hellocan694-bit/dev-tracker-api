import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { GitHubSuccessComponent } from './pages/github-success/github-success.component';
import { GitHubDashboardComponent } from './pages/github-dashboard/github-dashboard.component';
import { GithubLayoutComponent } from './pages/github-layout/github-layout.component';
import { ProAccessGuard } from 'src/app/core/guards/pro-access.guard';

const routes: Routes = [
  {
    path: '',
    component: GithubLayoutComponent,
    children: [
      {
        // OAuth callback landing — no guard, the backend redirect lands here
        path: 'success',
        component: GitHubSuccessComponent,
        title: 'GitHub Connected — DevTracker'
      },
      {
        // Protected: requires active Pro trial or paid subscription
        path: 'dashboard',
        component: GitHubDashboardComponent,
        canActivate: [ProAccessGuard],
        title: 'GitHub Repositories — DevTracker'
      },
      {
        path: '',
        redirectTo: 'dashboard',
        pathMatch: 'full'
      }
    ]
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class GithubRoutingModule {}
