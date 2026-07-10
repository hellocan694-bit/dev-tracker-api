import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { Developer } from 'src/app/shared/interfaces/developer';
import { AuthService } from 'src/app/core/services/auth.service';

/**
 * FeedbackStateService — Proxies the global AuthService state.
 */
@Injectable({ providedIn: 'root' })
export class FeedbackStateService {
  constructor(private authService: AuthService) {}

  get currentUser$(): Observable<Developer | null> {
    return this.authService.currentUser$;
  }
}

