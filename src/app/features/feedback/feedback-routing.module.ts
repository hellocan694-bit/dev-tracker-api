import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { FeedbackListComponent } from './pages/feedback-list/feedback-list.component';
import { FeedbackFormComponent } from './pages/feedback-form/feedback-form.component';
import { AdminStatsComponent } from './pages/admin-stats/admin-stats.component';
import { FeedbackLayoutComponent } from './pages/feedback-layout/feedback-layout.component';
import { loginGuard } from 'src/app/core/guards/login.guard';
import { adminGuard } from 'src/app/core/guards/admin.guard';
import { ownerGuard } from 'src/app/core/guards/owner.guard';

/**
 * Feedback Routing — matches every path from feedback_api_docs.md
 *
 * Route tree:
 *  /feedback                     → FeedbackList (my feedbacks)  🔓 authenticated
 *  /feedback/new                 → FeedbackForm (create)         🔓 authenticated
 *  /feedback/edit/:id            → FeedbackForm (update)         🔐 owner or admin
 *  /feedback/wall/:developerId   → FeedbackList (developer wall) 🔓 authenticated
 *  /feedback/admin/stats         → AdminStats                    🛡️ admin only
 */
const routes: Routes = [
  {
    path: '',
    component: FeedbackLayoutComponent,
    canActivate: [loginGuard],
    children: [
      // ── 🔓 Any authenticated user ──────────────────────────────
      {
        path: '',
        component: FeedbackListComponent,
        title: 'My Feedbacks — DevTracker',
      },
      {
        path: 'new',
        component: FeedbackFormComponent,
        title: 'Submit Feedback — DevTracker',
      },
      {
        path: 'wall/:developerId',
        component: FeedbackListComponent,
        title: 'Developer Wall — DevTracker',
      },

      // ── 🔐 Owner or Admin ──────────────────────────────────────
      {
        path: 'edit/:id',
        component: FeedbackFormComponent,
        canActivate: [ownerGuard],
        title: 'Edit Feedback — DevTracker',
      },

      // ── 🛡️ Admin only ──────────────────────────────────────────
      {
        path: 'admin/stats',
        component: AdminStatsComponent,
        canActivate: [adminGuard],
        title: 'Feedback Dashboard — DevTracker',
      },
    ],
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class FeedbackRoutingModule {}
