import { Injectable } from '@angular/core';
import {
  HttpRequest,
  HttpHandler,
  HttpEvent,
  HttpInterceptor
} from '@angular/common/http';
import { Observable } from 'rxjs';

/**
 * FIX #2 — AuthInterceptor Zombie eliminated.
 *
 * The previous implementation read `sessionStorage.getItem('token')` which
 * always returned null since the app migrated to HttpOnly cookie-based auth.
 * This caused it to silently append `Authorization: Bearer null` headers,
 * which could confuse the backend and cause intermittent auth failures.
 *
 * The HttpOnly cookie is now automatically forwarded on every request by the
 * CredentialsInterceptor (`withCredentials: true`). This interceptor is kept
 * as a clean pass-through and can be used for future non-auth concerns
 * (e.g., adding request IDs, correlation headers, etc.).
 */
@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  intercept(request: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
    // No manual token injection needed — the browser forwards the
    // HttpOnly JWT cookie automatically via CredentialsInterceptor.
    return next.handle(request);
  }
}
