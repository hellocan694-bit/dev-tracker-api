import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { AuthRoutingModule } from './auth-routing.module';
import { LoginComponent } from './pages/login/login.component';
import { RegisterComponent } from './pages/register/register.component';
import { VerfiyEmailComponent } from './pages/verfiy-email/verfiy-email.component';
import { AuthLayoutComponent } from './pages/features/auth/auth-layout/auth-layout.component';
import { ReactiveFormsModule } from '@angular/forms';
import { DevelopersettingsComponent } from './pages/developersettings/developersettings.component';
import { ChangepasswordemailpageComponent } from './pages/changepasswordemailpage/changepasswordemailpage.component';
import { UpdatepasswordComponent } from './pages/updatepassword/updatepassword.component';
import { LearnaboutusComponent } from './pages/learnaboutus/learnaboutus.component';


@NgModule({
  declarations: [
    LoginComponent,
    RegisterComponent,
    VerfiyEmailComponent,
    AuthLayoutComponent,
    DevelopersettingsComponent,
    ChangepasswordemailpageComponent,
    UpdatepasswordComponent,
    LearnaboutusComponent,
 
  ],
  imports: [
    CommonModule,
    AuthRoutingModule,
    ReactiveFormsModule
  ]
})
export class AuthModule { }
