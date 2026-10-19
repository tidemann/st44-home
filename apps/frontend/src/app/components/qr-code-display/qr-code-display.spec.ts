import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { vi } from 'vitest';
import { QrAuthService } from '../../services/qr-auth.service';
import { QrCodeDisplayComponent, escapeHtml } from './qr-code-display';

describe('escapeHtml', () => {
  it('escapes a child name before it goes into the print window', () => {
    expect(escapeHtml(`Ola "<img src=x onerror=alert(1)>" & 'Kari'`)).toBe(
      'Ola &quot;&lt;img src=x onerror=alert(1)&gt;&quot; &amp; &#39;Kari&#39;',
    );
  });

  it('keeps æøå as they are', () => {
    expect(escapeHtml('Bjørn Ærlig Åse')).toBe('Bjørn Ærlig Åse');
  });
});

describe('QrCodeDisplayComponent', () => {
  it('renders three plain secondary QR actions with the regenerate accessibility label', async () => {
    await TestBed.configureTestingModule({
      imports: [QrCodeDisplayComponent],
      providers: [
        {
          provide: QrAuthService,
          useValue: {
            getQrToken: () => of({ token: 'abc', expiresAt: '2030-01-01T00:00:00Z' }),
            generateQrToken: () => of({ token: 'abc', expiresAt: '2030-01-01T00:00:00Z' }),
          },
        },
      ],
    }).compileComponents();

    const fixture = TestBed.createComponent(QrCodeDisplayComponent);
    vi.spyOn(
      fixture.componentInstance as unknown as { generateQrCode: () => Promise<void> },
      'generateQrCode',
    ).mockResolvedValue(undefined);
    fixture.componentRef.setInput('childId', 'c1');
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const buttons = Array.from(
      (fixture.nativeElement as HTMLElement).querySelectorAll<HTMLButtonElement>(
        '.qr-actions button',
      ),
    );
    expect(buttons.length).toBe(3);
    expect(buttons.map((button) => button.textContent?.trim())).toEqual([
      'Last ned',
      'Skriv ut',
      'Ny kode',
    ]);
    expect(buttons[2].getAttribute('aria-label')).toBe('Generer QR-kode på nytt');
    for (const button of buttons) {
      expect(button.classList.contains('btn-secondary')).toBe(true);
      expect(button.classList.contains('btn-primary')).toBe(false);
      expect(button.textContent).not.toMatch(/📥|🖨|🔄/u);
    }
  });
});
