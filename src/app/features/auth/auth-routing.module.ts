import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { LoginComponent } from './pages/login/login.component';
import { RegisterComponent } from './pages/register/register.component';
import { VerfiyEmailComponent } from './pages/verfiy-email/verfiy-email.component';
import { AuthLayoutComponent } from './pages/features/auth/auth-layout/auth-layout.component';
import { authGuard } from 'src/app/core/guards/auth.guard';
import { DevelopersettingsComponent } from './pages/developersettings/developersettings.component';
import { loginGuard } from 'src/app/core/guards/login.guard';
import { ChangepasswordemailpageComponent } from './pages/changepasswordemailpage/changepasswordemailpage.component';
import { UpdatepasswordComponent } from './pages/updatepassword/updatepassword.component';
import { LearnaboutusComponent } from './pages/learnaboutus/learnaboutus.component';

const routes: Routes = [
  {
    path: '',
    component: AuthLayoutComponent,
    children: [
      { path: 'login', component: LoginComponent },
      { path: 'register', component: RegisterComponent },
      { path: 'verifyEmail', component: VerfiyEmailComponent },
      { path: 'developersettings', component: DevelopersettingsComponent, canActivate: [loginGuard] },
      { path: 'emailtochangepassword', component: ChangepasswordemailpageComponent },
      { path: 'changepassword', component: UpdatepasswordComponent },
      { path: 'learnaboutus', component: LearnaboutusComponent },

      {
        path: 'github/callback',
        loadComponent: () => import('../../shared/github-callback/github-callback.component')
          .then(m => m.GithubCallbackComponent)
      }
    ]
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class AuthRoutingModule { }