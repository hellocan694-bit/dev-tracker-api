import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { BehaviorSubject, map, Observable, of } from 'rxjs';
import { tap } from 'rxjs/operators';
import { environment } from 'src/environment/environment';
import { Task, TaskResponse } from 'src/app/shared/interfaces/task';
import { ApiResponse, ChartData } from 'src/app/shared/interfaces/weeklyStatues';

@Injectable({
  providedIn: 'root'
})
export class TaskService {
  private baseUrl = environment.apiUrl;

  constructor(private http: HttpClient) { }

  // ── Cache Layer (project-scoped) ───────────────────────────────────────────
  /**
   * Map<projectId, Task[]> — each project has its own isolated cache slot.
   * Switching between projects never serves another project's tasks.
   */
  private readonly _tasksMap = new Map<string, Task[]>();
  private readonly _tasksSource = new BehaviorSubject<Task[] | null>(null);

  /** Read-only stream. Emits the task list for the currently active project. */
  readonly tasks$ = this._tasksSource.asObservable();

  private _activeProjectId: string | null = null;

  private _setCacheForProject(projectId: string, tasks: Task[]): void {
    this._tasksMap.set(projectId, tasks);
    if (this._activeProjectId === projectId) {
      this._tasksSource.next(tasks);
    }
  }

  private _getCacheForProject(projectId: string): Task[] | undefined {
    return this._tasksMap.get(projectId);
  }

  /** Wipe cache for one project (e.g. after deleteAllTasks). */
  invalidateCacheForProject(projectId: string): void {
    this._tasksMap.delete(projectId);
    if (this._activeProjectId === projectId) {
      this._tasksSource.next(null);
    }
  }

  /** Wipe entire cache (e.g. on logout). */
  clearAllCache(): void {
    this._tasksMap.clear();
    this._tasksSource.next(null);
    this._activeProjectId = null;
  }

  // ── Cache-Gate ─────────────────────────────────────────────────────────────

  /**
   * Smart cache-gate for task lists.
   * - Cache HIT  → emits stored array instantly, zero HTTP.
   * - Cache MISS → fires GET, stores result, emits via tasks$.
   */
  loadTasks(projectId: string): Observable<Task[]> {
    this._activeProjectId = projectId;
    const cached = this._getCacheForProject(projectId);
    if (cached) {
      this._tasksSource.next(cached);
      return of(cached);
    }
    return this.getAllTasks(projectId).pipe(
      tap((tasks: Task[]) => this._setCacheForProject(projectId, tasks))
    );
  }

  // ── HTTP Methods ───────────────────────────────────────────────────────────

  getAllTasks(projectId: string): Observable<Task[]> {
    return this.http.get<Task[]>(
      `${this.baseUrl}/project/dev/tasks/getalltasks/${projectId}`
    );
  }

  /** Create — prepends new task to the project's cache slot. */
  createTask(projectId: string, data: Partial<Task>): Observable<TaskResponse> {
    return this.http
      .post<TaskResponse>(
        `${this.baseUrl}/project/dev/tasks/createtask/${projectId}`,
        data
      )
      .pipe(
        tap((res) => {
          const newTask: Task = res?.task ?? (res as any);
          const cached = this._getCacheForProject(projectId);
          if (cached && newTask?._id) {
            this._setCacheForProject(projectId, [newTask, ...cached]);
          }
        })
      );
  }

  /** Update — merges changed fields into the cached record in-place. */
  updateTask(
    projectId: string,
    taskId: string,
    data: Partial<Task>
  ): Observable<TaskResponse> {
    return this.http
      .patch<TaskResponse>(
        `${this.baseUrl}/project/dev/tasks/updatetask/${projectId}/${taskId}`,
        data
      )
      .pipe(
        tap((res) => {
          const updated: Partial<Task> = res?.task ?? data;
          const cached = this._getCacheForProject(projectId);
          if (cached) {
            this._setCacheForProject(
              projectId,
              cached.map((t) => (t._id === taskId ? { ...t, ...updated } : t))
            );
          }
        })
      );
  }

  /** Complete — sets status to 'done' in the cache immediately. */
  completeTask(projectId: string, taskId: string): Observable<any> {
    return this.http
      .patch(
        `${this.baseUrl}/project/dev/${projectId}/tasks/${taskId}/complete`,
        {}
      )
      .pipe(
        tap(() => {
          const cached = this._getCacheForProject(projectId);
          if (cached) {
            this._setCacheForProject(
              projectId,
              cached.map((t) =>
                t._id === taskId ? { ...t, status: 'done' as const } : t
              )
            );
          }
        })
      );
  }

  /** Delete all tasks — wipes the project's cache slot. */
  deleteAllTasks(projectId: string): Observable<any> {
    return this.http
      .delete(
        `${this.baseUrl}/project/dev/tasks/deletealltasks/${projectId}`
      )
      .pipe(tap(() => this.invalidateCacheForProject(projectId)));
  }

  // ── Activity Methods (start / pause / resume) ──────────────────────────────
  // Updates `statusActivity` in the cache so dashboards reflect timer state
  // instantly without a round-trip GET.

  startTask(projectId: string, taskId: string): Observable<any> {
    return this.http
      .post(
        `${this.baseUrl}/activityproject/projects/${projectId}/tasks/${taskId}/start`,
        {}
      )
      .pipe(tap(() => this._patchActivityStatus(projectId, taskId, 'RUNNING')));
  }

  pauseTask(projectId: string, taskId: string): Observable<any> {
    return this.http
      .post(
        `${this.baseUrl}/activityproject/projects/${projectId}/tasks/${taskId}/pause`,
        {}
      )
      .pipe(tap(() => this._patchActivityStatus(projectId, taskId, 'PAUSED')));
  }

  resumeTask(projectId: string, taskId: string): Observable<any> {
    return this.http
      .post(
        `${this.baseUrl}/activityproject/projects/${projectId}/tasks/${taskId}/resume`,
        {}
      )
      .pipe(tap(() => this._patchActivityStatus(projectId, taskId, 'RUNNING')));
  }

  private _patchActivityStatus(
    projectId: string,
    taskId: string,
    statusActivity: Task['statusActivity']
  ): void {
    const cached = this._getCacheForProject(projectId);
    if (cached) {
      this._setCacheForProject(
        projectId,
        cached.map((t) => (t._id === taskId ? { ...t, statusActivity } : t))
      );
    }
  }

  // ── Read-Only Queries (point-in-time, no caching needed) ───────────────────

  getFinancal(projectId: string): Observable<any> {
    return this.http.get(`${this.baseUrl}/project/dev/${projectId}/financials`);
  }

  getTaskStatus(projectId: string, taskId: string): Observable<any> {
    return this.http.get(
      `${this.baseUrl}/activityproject/projects/${projectId}/tasks/${taskId}/status`
    );
  }

  getTaskSessions(projectId: string, taskId: string): Observable<any> {
    return this.http.get(
      `${this.baseUrl}/activityproject/projects/${projectId}/tasks/${taskId}/sessions`
    );
  }

  getWeeklyStats(): Observable<ChartData[]> {
    return this.http
      .get<ApiResponse>(`${this.baseUrl}/activityproject/productivity-stats`)
      .pipe(
        map((response) =>
          response.data.map((item) => ({
            name: new Date(item.date).toLocaleDateString('en-US', {
              weekday: 'short',
            }),
            value: item.hours,
          }))
        )
      );
  }
}