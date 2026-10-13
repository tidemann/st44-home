import { describe, it, expect, beforeEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { ConfirmDialogService } from './confirm-dialog.service';

describe('ConfirmDialogService', () => {
  let service: ConfirmDialogService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ConfirmDialogService);
  });

  it('holds the question until it is answered', async () => {
    const answer = service.confirm({ title: 'Slette?', message: 'm', confirmLabel: 'Slett' });
    expect(service.pending()?.title).toBe('Slette?');

    service.answer(true);

    expect(await answer).toBe(true);
    expect(service.pending()).toBeNull();
  });

  it('resolves false when cancelled', async () => {
    const answer = service.confirm({ title: 't', message: 'm', confirmLabel: 'OK' });
    service.answer(false);
    expect(await answer).toBe(false);
  });

  it('answers an open question with false when a second one is asked', async () => {
    const first = service.confirm({ title: 'first', message: 'm', confirmLabel: 'OK' });
    const second = service.confirm({ title: 'second', message: 'm', confirmLabel: 'OK' });

    expect(await first).toBe(false);
    expect(service.pending()?.title).toBe('second');
    service.answer(true);
    expect(await second).toBe(true);
  });
});
