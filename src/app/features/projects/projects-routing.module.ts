import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { HomelayoutComponent } from './pages/homelayout/homelayout.component';
import { MasterhomeComponent } from './pages/masterhome/masterhome.component';
import { ProjectsListComponent } from './pages/projects-list/projects-list.component';
import { ArchivedProjectsComponent } from './pages/archived-projects/archived-projects.component';
import { GuesthomeComponent } from './pages/guesthome/guesthome.component';
import { loginGuard } from 'src/app/core/guards/login.guard';
import { CreateprojectComponent } from './pages/createproject/createproject.component';
import { HistoryComponent } from './pages/history/history.component';
import { ViewMainProjectComponent } from './pages/view-main-project/view-main-project.component';
import { TaskManagementMasterComponent } from './components/task-management-master/task-management-master.component';
import { PrivacyPolicyComponent } from './pages/privacy-policy/privacy-policy.component';
import { NotificationsComponent } from './pages/notifications/notifications.component';

const routes: Routes = [
  {path:'',
    component:HomelayoutComponent, 
    children:[
      {path: '', redirectTo:'guesthomepage', pathMatch: 'full'},
      {path:'masterhome' , component:MasterhomeComponent ,  canActivate:[loginGuard]}, 
      {path:'guesthomepage'  , component:GuesthomeComponent},
      {path:'privacy-policy'  , component:PrivacyPolicyComponent},
      {path:'projects' , component:ProjectsListComponent ,  canActivate:[loginGuard]} ,  
      {path:'archivedprojects' , component:ArchivedProjectsComponent , canActivate:[loginGuard]},
      {path:'createproject' , component:CreateprojectComponent , canActivate:[loginGuard]},
      {path:'activeprojects' , component:ProjectsListComponent , canActivate:[loginGuard]},
      {path:'completedprojects' , component:HistoryComponent , canActivate:[loginGuard]},
      {path:'viewproject/:id' , component:ViewMainProjectComponent , canActivate:[loginGuard]},
      {path:'taskmanagement' , component:TaskManagementMasterComponent , canActivate:[loginGuard]},
      {path:'notifications'  , component:NotificationsComponent , canActivate:[loginGuard]}
    ]
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class ProjectsRoutingModule { }
