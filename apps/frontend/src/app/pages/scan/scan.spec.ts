import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import type { ScanResult } from '@st44/types';
import { ScanPage } from './scan';
import { TurnService } from '../../services/turn.service';
import { AuthService } from '../../services/auth.service';

describe('ScanPage', () => {
  let fixture: ComponentFixture<ScanPage>;
  let answer: ScanResult;
  const taskId = '33333333-3333-4333-8333-333333333333';

  async function render(): Promise<string> {
    await TestBed.configureTestingModule({
      imports: [ScanPage],
      providers: [
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { paramMap: convertToParamMap({ code: 'ABC234' }) } },
        },
        { provide: TurnService, useValue: { scan: vi.fn(async () => answer) } },
        {
          provide: AuthService,
          useValue: { currentUser: () => null, getUserRole: () => 'parent' },
        },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(ScanPage);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    return (fixture.nativeElement as HTMLElement).textContent?.replace(/\s+/g, ' ') ?? '';
  }

  beforeEach(() => TestBed.resetTestingModule());

  it('tells a grown-up who can finish it, not «not your turn» (ST-2114)', async () => {
    answer = {
      result: 'parent',
      taskId,
      taskName: 'Tømme oppvaskmaskinen',
      points: 5,
      turnChildName: 'Emma',
    };
    const text = await render();
    expect(text).toContain('Det er Emmas tur');
    expect(text).toContain('Du er logget inn som voksen. Bare Emma kan hake av oppgaven med koden.');
    expect(text).toContain('Til oppgavene');
    expect(text).not.toContain('haker den av når oppgaven er gjort');
  });
});
