import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { TeamsLayoutComponent } from './pages/teams-layout/teams-layout.component';
import { InvitationsComponent } from './pages/invitations/invitations.component';
import { loginGuard } from 'src/app/core/guards/login.guard';
import { TeamleaderComponent } from './pages/teamleader/teamleader.component';

const routes: Routes = 
[
  
  {
    path:"",
    component:TeamsLayoutComponent,
    children:[
      {path:"invitations" , component:InvitationsComponent , canActivate:[loginGuard]},
      {path:"teamleaderboard" , component:TeamleaderComponent , canActivate:[loginGuard]}
    ]
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class TeamRoutingModule { }
