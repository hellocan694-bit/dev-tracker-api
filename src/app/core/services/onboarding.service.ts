import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, Subject, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from 'src/environment/environment';
import { OnboardingApiResponse, OnboardingMessage } from 'src/app/shared/interfaces/onboarding.model';
import { SocketService } from 'src/app/core/services/socket.service';

@Injectable({
  providedIn: 'root'
})
export class OnboardingService {
  private readonly apiUrl = environment.apiUrl;

  /** Emits whenever a new ARIA message arrives (socket OR manual trigger) */
  private _onboardingMessage$ = new Subject<OnboardingMessage>();
  readonly onboardingMessage$ = this._onboardingMessage$.asObservable();

  constructor(
    private http: HttpClient,
    private socketService: SocketService
  ) {
    this.listenToSocket();
  }

  // ─── Socket Listener ───────────────────────────────────────────────────────

  /**
   * Subscribe to the `onboarding_message` Socket.io event.
   * When received the payload is pushed through the shared Subject so any
   * component that subscribes to onboardingMessage$ gets notified automatically.
   */
  private listenToSocket(): void {
    this.socketService.onEvent('onboarding_message').subscribe({
      next: (payload: OnboardingMessage) => {
        this._onboardingMessage$.next(payload);
      },
      error: (err) => console.error('[OnboardingService] socket error:', err)
    });
  }

  // ─── HTTP ─────────────────────────────────────────────────────────────────

  /**
   * Manually trigger the 3-agent onboarding pipeline.
   * POST /onboarding/trigger/sync
   * @param projectId  Target project _id
   * @param memberId   Developer being onboarded
   */
  triggerSync(projectId: string, memberId: string): Observable<OnboardingApiResponse> {
    return this.http.post<OnboardingApiResponse>(
      `${this.apiUrl}/onboarding/trigger/sync`,
      { projectId, memberId }
    ).pipe(
      catchError(error => {
        console.error('[OnboardingService] HTTP Error:', error);
        return throwError(() => error);
      })
    );
  }

  /**
   * Programmatically push a message into the stream
   * (useful for testing or after a successful REST call).
   */
  pushMessage(message: OnboardingMessage): void {
    this._onboardingMessage$.next(message);
  }
}
