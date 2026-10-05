/**
 * Offline Sync Interceptor
 *
 * Records when the app last got an API answer from the network, so the offline
 * strip can say how old the data on screen is. Answers the service worker served
 * from its cache carry `X-Diddit-Offline: 1` and do not count.
 */

import { HttpInterceptorFn, HttpResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { tap } from 'rxjs';
import { PwaService } from '../services/pwa.service';

export const OFFLINE_HEADER = 'X-Diddit-Offline';

export const offlineSyncInterceptor: HttpInterceptorFn = (req, next) => {
  const pwa = inject(PwaService);
  return next(req).pipe(
    tap((event) => {
      if (event instanceof HttpResponse && event.ok && !event.headers.has(OFFLINE_HEADER)) {
        pwa.markSynced();
      }
    }),
  );
};
