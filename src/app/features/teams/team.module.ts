import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { TeamRoutingModule } from './team-routing.module';
import { TeamsLayoutComponent } from './pages/teams-layout/teams-layout.component';
import { InvitationsComponent } from './pages/invitations/invitations.component';
import { TeamleaderComponent } from './pages/teamleader/teamleader.component';
import { FormsModule } from '@angular/forms';


@NgModule({
  declarations: [
    InvitationsComponent,
    TeamleaderComponent
  ],
  imports: [
    CommonModule,
    TeamRoutingModule,
    TeamsLayoutComponent,
    FormsModule
  ]
})
export class TeamModule { }
