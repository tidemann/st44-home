import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { OfflineBanner } from './offline-banner';
import { PwaService } from '../../services/pwa.service';

describe('OfflineBanner', () => {
  let fixture: ComponentFixture<OfflineBanner>;
  const online = signal(true);
  const lastSyncAt = signal<number | null>(null);

  beforeEach(async () => {
    online.set(true);
    lastSyncAt.set(null);
    await TestBed.configureTestingModule({
      imports: [OfflineBanner],
      providers: [{ provide: PwaService, useValue: { online, lastSyncAt } }],
    }).compileComponents();
    fixture = TestBed.createComponent(OfflineBanner);
  });

  it('is hidden while online', () => {
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.offline-banner')).toBeNull();
  });

  it('shows the time of the last data when offline', () => {
    online.set(false);
    lastSyncAt.set(new Date(2026, 9, 5, 16, 2).getTime());
    fixture.detectChanges();

    const banner = fixture.nativeElement.querySelector('.offline-banner') as HTMLElement;
    expect(banner.getAttribute('role')).toBe('status');
    expect(banner.textContent).toContain('Ingen nett');
    expect(banner.textContent).toContain('kl. 16:02');
  });

  it('says changes wait for the network when there is no data yet', () => {
    online.set(false);
    fixture.detectChanges();

    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('Endringer kan ikke lagres');
    expect(text).not.toContain('kl.');
  });
});
