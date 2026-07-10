import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environment/environment';
import {
  CreateFeedbackDto,
  UpdateFeedbackDto,
  FeedbackListResponse,
  PublicFeedbackListResponse,
  SingleFeedbackResponse,
  CountResponse,
  FeedbackType,
  FeedbackStatus,
  FeedbackRating,
} from 'src/app/shared/interfaces/feedback';

/**
 * FeedbackService — covers ALL 14 endpoints from feedback_api_docs.md.
 * The Authorization header is injected automatically by AuthInterceptor.
 */
@Injectable({ providedIn: 'root' })
export class FeedbackService {
  private readonly base = `${environment.apiUrl}/feedbacks`;

  constructor(private http: HttpClient) {}

  // ── 1. POST /feedbacks ────────────────────────────────────────────────
  submit(dto: CreateFeedbackDto): Observable<SingleFeedbackResponse> {
    return this.http.post<SingleFeedbackResponse>(this.base, dto);
  }

  // ── 2. GET /feedbacks/me ─────────────────────────────────────────────
  getMyFeedbacks(): Observable<FeedbackListResponse> {
    return this.http.get<FeedbackListResponse>(`${this.base}/me`);
  }

  // ── 3. GET /feedbacks/developer/:id ──────────────────────────────────
  getDeveloperWall(developerId: string): Observable<FeedbackListResponse | PublicFeedbackListResponse> {
    return this.http.get<FeedbackListResponse | PublicFeedbackListResponse>(
      `${this.base}/developer/${developerId}`
    );
  }

  // ── 4. GET /feedbacks/:id ─────────────────────────────────────────────
  getById(id: string): Observable<SingleFeedbackResponse> {
    return this.http.get<SingleFeedbackResponse>(`${this.base}/${id}`);
  }

  // ── 5. PATCH /feedbacks/:id ───────────────────────────────────────────
  update(id: string, dto: UpdateFeedbackDto): Observable<SingleFeedbackResponse> {
    return this.http.patch<SingleFeedbackResponse>(`${this.base}/${id}`, dto);
  }

  // ── 6. DELETE /feedbacks/:id ──────────────────────────────────────────
  remove(id: string): Observable<{ status: string; message: string; data: null }> {
    return this.http.delete<{ status: string; message: string; data: null }>(`${this.base}/${id}`);
  }

  // ── 7. GET /feedbacks/filter/status/:status ───────────────────────────
  filterByStatus(status: FeedbackStatus): Observable<FeedbackListResponse> {
    return this.http.get<FeedbackListResponse>(`${this.base}/filter/status/${status}`);
  }

  // ── 8. GET /feedbacks/filter/type/:type ──────────────────────────────
  filterByType(type: FeedbackType): Observable<FeedbackListResponse> {
    return this.http.get<FeedbackListResponse>(`${this.base}/filter/type/${type}`);
  }

  // ── 9. GET /feedbacks/filter/rating/:rating ───────────────────────────
  filterByRating(rating: FeedbackRating): Observable<FeedbackListResponse> {
    return this.http.get<FeedbackListResponse>(`${this.base}/filter/rating/${rating}`);
  }

  // ── 10. GET /feedbacks/admin/developer/:id ────────────────────────────
  adminGetDeveloperFeedbacks(developerId: string): Observable<FeedbackListResponse> {
    return this.http.get<FeedbackListResponse>(`${this.base}/admin/developer/${developerId}`);
  }

  // ── 11. GET /feedbacks/admin/count ───────────────────────────────────
  adminCount(): Observable<CountResponse> {
    return this.http.get<CountResponse>(`${this.base}/admin/count`);
  }

  // ── 12. GET /feedbacks/admin/count/type/:type ─────────────────────────
  adminCountByType(type: FeedbackType): Observable<CountResponse> {
    return this.http.get<CountResponse>(`${this.base}/admin/count/type/${type}`);
  }

  // ── 13. GET /feedbacks/admin/count/status/:status ─────────────────────
  adminCountByStatus(status: FeedbackStatus): Observable<CountResponse> {
    return this.http.get<CountResponse>(`${this.base}/admin/count/status/${status}`);
  }

  // ── 14. GET /feedbacks/admin/count/rating/:rating ─────────────────────
  adminCountByRating(rating: FeedbackRating): Observable<CountResponse> {
    return this.http.get<CountResponse>(`${this.base}/admin/count/rating/${rating}`);
  }
}
