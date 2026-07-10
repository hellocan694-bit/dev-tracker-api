import { HTTP_INTERCEPTORS } from '@angular/common/http';
import { CredentialsInterceptor } from './credentials.interceptor';

export const httpInterceptorProviders = [
  { provide: HTTP_INTERCEPTORS, useClass: CredentialsInterceptor, multi: true },
];
