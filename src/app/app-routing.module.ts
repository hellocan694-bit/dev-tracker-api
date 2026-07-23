import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { ErrorpageComponent } from './shared/components/errorpage/errorpage.component';

const routes: Routes = [
  {
    path: '',
    redirectTo: 'home/guesthomepage',
    pathMatch: 'full'
  },
  {
    path: 'auth',
    loadChildren: () => import('./features/auth/auth.module').then(m => m.AuthModule)
  },
  {
    path: 'home',
    loadChildren: () => import('./features/projects/projects.module').then(m => m.ProjectsModule),
  },
  {
    path: 'teams',
    loadChildren: () => import('./features/teams/team.module').then(m => m.TeamModule),
  },
  {
    path: 'subscriptions',
    loadChildren: () => import('./features/subscriptions/subscriptions.module').then(m => m.SubscriptionsModule),
  },

  {
    path: 'feedback',
    loadChildren: () => import('./features/feedback/feedback.module').then(m => m.FeedbackModule),
  },
  {
    path: 'github',
    loadChildren: () => import('./features/github/github.module').then(m => m.GithubModule)
  },
  {
    path: '**',
    component: ErrorpageComponent

  }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
