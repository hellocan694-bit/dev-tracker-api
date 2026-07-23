import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';

import { ProjectsRoutingModule } from './projects-routing.module';
import { ProjectsListComponent } from './pages/projects-list/projects-list.component';
import { ArchivedProjectsComponent } from './pages/archived-projects/archived-projects.component';
import { HistoryComponent } from './pages/history/history.component';
import { ViewMainProjectComponent } from './pages/view-main-project/view-main-project.component';
import { NgxChartsModule } from '@swimlane/ngx-charts';
import { GuesthomeComponent } from './pages/guesthome/guesthome.component';
import { CreateprojectComponent } from './pages/createproject/createproject.component';
import { HomelayoutComponent } from './pages/homelayout/homelayout.component';
import { ReactiveFormsModule } from '@angular/forms';
import { LiquidButtonComponent } from './components/liquid-button/liquid-button.component';
import { WebglShaderComponent } from './components/webgl-shader/webgl-shader.component';
import { TestimonialsComponent } from './components/testimonials/testimonials.component';
import { NotificationsComponent } from './pages/notifications/notifications.component';

@NgModule({
  declarations: [
    ProjectsListComponent,
    ArchivedProjectsComponent,
    GuesthomeComponent,
    CreateprojectComponent,
    HistoryComponent,
    ViewMainProjectComponent,
    LiquidButtonComponent,
    WebglShaderComponent,
    TestimonialsComponent,
    NotificationsComponent
  ],
  imports: [
    CommonModule,
    ProjectsRoutingModule,
    HomelayoutComponent,
    ReactiveFormsModule,
    RouterModule,
    FormsModule,
    NgxChartsModule
  ]
})
export class ProjectsModule { }
