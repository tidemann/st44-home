import { TestBed } from '@angular/core/testing';
import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { firstValueFrom } from 'rxjs';
import { offlineSyncInterceptor, OFFLINE_HEADER } from './offline-sync.interceptor';
import { PwaService } from '../services/pwa.service';

describe('offlineSyncInterceptor', () => {
  let http: HttpClient;
  let controller: HttpTestingController;
  const markSynced = vi.fn();

  beforeEach(() => {
    markSynced.mockClear();
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([offlineSyncInterceptor])),
        provideHttpClientTesting(),
        { provide: PwaService, useValue: { markSynced } },
      ],
    });
    http = TestBed.inject(HttpClient);
    controller = TestBed.inject(HttpTestingController);
  });

  afterEach(() => controller.verify());

  it('records a sync for an answer from the network', async () => {
    const done = firstValueFrom(http.get('/api/tasks'));
    controller.expectOne('/api/tasks').flush([]);
    await done;
    expect(markSynced).toHaveBeenCalledTimes(1);
  });

  it('ignores answers the service worker served from its cache', async () => {
    const done = firstValueFrom(http.get('/api/tasks'));
    controller.expectOne('/api/tasks').flush([], { headers: { [OFFLINE_HEADER]: '1' } });
    await done;
    expect(markSynced).not.toHaveBeenCalled();
  });

  it('ignores failed requests', async () => {
    const done = firstValueFrom(http.get('/api/tasks')).catch(() => undefined);
    controller.expectOne('/api/tasks').flush('x', { status: 500, statusText: 'Server Error' });
    await done;
    expect(markSynced).not.toHaveBeenCalled();
  });
});
