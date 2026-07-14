import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { TeamRoutingModule } from './team-routing.module';
import { TeamsLayoutComponent } from './pages/teams-layout/teams-layout.component';
import { InvitationsComponent } from './pages/invitations/invitations.component';
import { TeamleaderComponent } from './pages/teamleader/teamleader.component';
import { FormsModule } from '@angular/forms';
import { MyTeamsComponent } from './pages/my-teams/my-teams.component';



@NgModule({
  declarations: [
    InvitationsComponent,
    TeamleaderComponent
  ],
  imports: [
    CommonModule,
    TeamRoutingModule,
    TeamsLayoutComponent,
    MyTeamsComponent,
    FormsModule
  ]
})
export class TeamModule { }
