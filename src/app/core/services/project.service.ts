import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, of, throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { Project } from 'src/app/shared/interfaces/project';
import { ProjectResponse } from 'src/app/shared/interfaces/ProjectResponse';
import { UpdateProjectPayload } from 'src/app/shared/interfaces/task';
import { environment } from 'src/environment/environment';

@Injectable({
  providedIn: 'root',
})
export class ProjectService {
  private baseUrl = environment.apiUrl;
  constructor(private http: HttpClient) {}

  // ── Cache Layer ────────────────────────────────────────────────────────────
  /** Null = cache is empty / not yet loaded. */
  private readonly _projects$ = new BehaviorSubject<Project[] | null>(null);

  /** Read-only stream. Components subscribe; the service pushes updates. */
  readonly projects$ = this._projects$.asObservable();

  /** True once the first successful GET has populated the cache. */
  get isCacheLoaded(): boolean {
    return this._projects$.getValue() !== null;
  }

  /**
   * Smart cache-gate: returns the cached stream immediately if data exists,
   * otherwise fires a single HTTP GET and populates the cache.
   * Pagination note: cache covers page-1 (the default view). Navigating to
   * other pages still uses `getAllProjects()` directly for correct results.
   */
  loadProjects(page: number = 1, limit: number = 10): Observable<ProjectResponse> {
    if (this.isCacheLoaded && page === 1) {
      // Serve from cache — zero HTTP calls.
      return of({ page: 1, limit, total: this._projects$.getValue()!.length, Projects: this._projects$.getValue()! });
    }
    return this.getAllProjects(page, limit).pipe(
      tap((res) => {
        const list = this._extractProjects(res);
        if (page === 1) this._projects$.next(list);
      })
    );
  }

  /** Force-refresh the cache (call after destructive mutations if needed). */
  invalidateCache(): void {
    this._projects$.next(null);
  }

  /** Extract the project array from the polymorphic API response shape. */
  private _extractProjects(res: ProjectResponse): Project[] {
    return Array.isArray(res.Projects)
      ? res.Projects
      : (res.Projects && Array.isArray((res.Projects as any).projects)
          ? (res.Projects as any).projects
          : []);
  }

  private historyCountSource = new BehaviorSubject<number>(0);
historyCount$ = this.historyCountSource.asObservable();

updateHistoryCount(count: number) {
  this.historyCountSource.next(count);
}
getAllProjects(page: number = 1, limit: number = 10): Observable<ProjectResponse> {
  
  let params = new HttpParams()
    .set('page', page.toString())
    .set('limit', limit.toString());

  return this.http.get<ProjectResponse>(`${this.baseUrl}/developer/dev/projectdev/projects`, { params });
}
  /**
   * Archive a project. On success, removes it from the local cache instantly
   * so the UI updates without a refetch.
   */
  completeProject(projectId: string): Observable<any> {
    return this.http
      .patch(`${this.baseUrl}/developer/dev/projectdev/archiveprojectdev/${projectId}`, {})
      .pipe(
        tap(() => {
          const current = this._projects$.getValue();
          if (current) {
            this._projects$.next(current.filter((p) => p._id !== projectId));
          }
        })
      );
  }

  /**
   * Create a project. On success, prepends the new record to the cache
   * so the list updates immediately without a refetch.
   */
  createProject(data: any): Observable<any> {
    return this.http
      .post<any>(`${this.baseUrl}/developer/dev/projectdev/createprojectdev`, data)
      .pipe(
        tap((res) => {
          const newProject: Project = res?.data ?? res;
          const current = this._projects$.getValue();
          if (current && newProject?._id) {
            this._projects$.next([newProject, ...current]);
          }
        })
      );
  }

  getCompletedProjects(page: number = 0): Observable<ProjectResponse> {
    let params = new HttpParams().set('page', page.toString());
    return this.http.get<ProjectResponse>(
      `${this.baseUrl}/developer/dev/projectdev/archivedprojects/history`,
      { params }
    );
  }

  clearAllhistory(): Observable<any> {
    return this.http.delete(`${this.baseUrl}/developer/dev/projectdev/clearhistory`, {});
  }

  /**
   * Delete a project. On success, removes it from the local cache instantly.
   */
  deleteOneProject(projectId: string): Observable<any> {
    return this.http
      .delete(`${this.baseUrl}/developer/dev/projectdev/deleteProject/${projectId}`)
      .pipe(
        tap(() => {
          const current = this._projects$.getValue();
          if (current) {
            this._projects$.next(current.filter((p) => p._id !== projectId));
          }
        })
      );
  }


  getWeeklyStats(): Observable<any> {
  return this.http.get<any>(`${this.baseUrl}/activityproject/my-weekly-hours`);
}

  /**
   * PATCH /developer/dev/projectdev/updateproject/:id
   * Authorization: Project Owner or Platform Admin only (enforced by server).
   * At least one field in payload is required.
   * On success, merges the changed fields into the cached record immediately.
   */
  updateProject(
    projectId: string,
    payload: UpdateProjectPayload
  ): Observable<{ status: string; message: string; data: Partial<Project> }> {
    return this.http
      .patch<{ status: string; message: string; data: Partial<Project> }>(
        `${this.baseUrl}/developer/dev/projectdev/updateproject/${projectId}`,
        payload
      )
      .pipe(
        tap((res) => {
          const current = this._projects$.getValue();
          if (current && res?.data) {
            // Merge only the changed fields — no full refetch needed.
            this._projects$.next(
              current.map((p) =>
                p._id === projectId ? { ...p, ...res.data } : p
              )
            );
          }
        }),
        catchError((err) => {
          const message =
            err?.error?.message || 'Failed to update project. Please try again.';
          return throwError(() => new Error(message));
        })
      );
  }

}
