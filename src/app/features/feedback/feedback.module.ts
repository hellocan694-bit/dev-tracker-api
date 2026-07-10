import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';

import { FeedbackRoutingModule } from './feedback-routing.module';
import { FeedbackListComponent } from './pages/feedback-list/feedback-list.component';
import { FeedbackFormComponent } from './pages/feedback-form/feedback-form.component';
import { AdminStatsComponent } from './pages/admin-stats/admin-stats.component';
import { FeedbackLayoutComponent } from './pages/feedback-layout/feedback-layout.component';

// Agent 1 — Standalone sub-components
import { StarRatingComponent } from 'src/app/shared/components/star-rating/star-rating.component';

@NgModule({
  declarations: [
    FeedbackListComponent,
    FeedbackFormComponent,
    AdminStatsComponent,
  ],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule,
    FeedbackLayoutComponent,        // standalone layout with sidebar + toast
    FeedbackRoutingModule,
    StarRatingComponent,             // standalone CVA star picker
  ],
})
export class FeedbackModule {}
