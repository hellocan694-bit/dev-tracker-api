import { Injectable } from '@angular/core';
import {
  HttpRequest,
  HttpHandler,
  HttpEvent,
  HttpInterceptor
} from '@angular/common/http';
import { Observable } from 'rxjs';

/**
 * Credentials Interceptor
 * Attaches `withCredentials: true` to every outgoing HTTP request so the
 * browser automatically sends the HttpOnly JWT cookie set by the backend.
 *
 * Replaces the old pattern of reading a token from sessionStorage and
 * manually appending an Authorization header.
 */
@Injectable()
export class CredentialsInterceptor implements HttpInterceptor {
  intercept(request: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
    const cloned = request.clone({ withCredentials: true });
    return next.handle(cloned);
  }
}
