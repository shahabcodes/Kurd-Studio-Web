import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { finalize } from 'rxjs';

// Simple loading state - can be expanded with a loading service
let activeRequests = 0;

export const loadingInterceptor: HttpInterceptorFn = (req, next) => {
  activeRequests++;

  return next(req).pipe(
    finalize(() => {
      activeRequests--;
    })
  );
};
