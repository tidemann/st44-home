import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, convertToParamMap, provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { of, throwError } from 'rxjs';
import { ChildLoginComponent } from './child-login';
import { AuthService } from '../services/auth.service';
import { HouseholdService } from '../services/household.service';
import { QrAuthService } from '../services/qr-auth.service';
import { TokenService } from '../services/token.service';
import { TurnService } from '../services/turn.service';

describe('ChildLoginComponent (ST-1999: QR first, e-mail second)', () => {
  let fixture: ComponentFixture<ChildLoginComponent>;
  let el: HTMLElement;
  let router: Router;
  let mockAuthService: {
    login: ReturnType<typeof vi.fn>;
    currentUser: { set: ReturnType<typeof vi.fn> };
    isAuthenticated: { set: ReturnType<typeof vi.fn> };
  };
  let mockQrAuthService: { loginWithQrToken: ReturnType<typeof vi.fn> };
  let mockTokenService: { storeTokens: ReturnType<typeof vi.fn> };

  const text = (selector: string) =>
    (el.querySelector(selector)?.textContent ?? '').replace(/\s+/g, ' ').trim();

  const click = async (selector: string) => {
    (el.querySelector(selector) as HTMLButtonElement).click();
    fixture.detectChanges();
    await fixture.whenStable();
  };

  beforeEach(() => {
    mockAuthService = {
      login: vi.fn(),
      currentUser: { set: vi.fn() },
      isAuthenticated: { set: vi.fn() },
    };
    mockQrAuthService = { loginWithQrToken: vi.fn() };
    mockTokenService = { storeTokens: vi.fn() };

    TestBed.configureTestingModule({
      imports: [ChildLoginComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: AuthService, useValue: mockAuthService },
        { provide: QrAuthService, useValue: mockQrAuthService },
        { provide: TokenService, useValue: mockTokenService },
        {
          provide: HouseholdService,
          useValue: { autoActivateHousehold: vi.fn().mockResolvedValue(undefined) },
        },
      ],
    });

    fixture = TestBed.createComponent(ChildLoginComponent);
    el = fixture.nativeElement;
    router = TestBed.inject(Router);
    vi.spyOn(router, 'navigate').mockResolvedValue(true);
    fixture.detectChanges();
  });

  it('opens with the two choices: yellow «Skann QR-kode» first, outline «Logg inn med e-post» second', () => {
    const buttons = Array.from(el.querySelectorAll('.choice-list > button'));
    expect(buttons.map((b) => b.textContent?.trim())).toEqual([
      'Skann QR-kode',
      'Logg inn med e-post',
    ]);
    expect(buttons[0].classList).toContain('submit-button');
    expect(buttons[1].classList).toContain('alt-button');
    expect(el.querySelector('form')).toBeNull();
    expect(text('.help-text')).toBe('Trenger du hjelp? Spør en forelder');
  });

  it('draws the Diddit mark in the band', () => {
    expect(el.querySelector('.header app-diddit-mark')).not.toBeNull();
  });

  it('«Logg inn med e-post» shows the form with autocomplete, focuses the e-mail field, and adds the outline QR button under «Logg inn»', async () => {
    await click('.email-choice');

    const email = el.querySelector('#email') as HTMLInputElement;
    expect(email.getAttribute('autocomplete')).toBe('username');
    expect(el.querySelector('#password')?.getAttribute('autocomplete')).toBe('current-password');
    expect(document.activeElement).toBe(email);

    const submit = el.querySelector('form .submit-button') as HTMLElement;
    const qr = el.querySelector('.qr-in-form') as HTMLElement;
    expect(submit.textContent?.trim()).toBe('Logg inn');
    expect(qr.textContent?.trim()).toBe('Skann QR-kode');
    expect(submit.compareDocumentPosition(qr) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('«Skann QR-kode» opens the scanner, moves focus to it, and hides the help line', async () => {
    await click('.qr-choice');

    const section = el.querySelector('.qr-scanner-section');
    expect(section?.querySelector('app-qr-code-scanner')).not.toBeNull();
    expect(document.activeElement).toBe(section);
    expect(el.querySelector('.help-section')).toBeNull();
  });

  it('a refused sign-in says «Feil e-post eller passord. Prøv igjen.» and marks both fields', async () => {
    mockAuthService.login.mockReturnValue(throwError(() => ({ status: 401 })));
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    await click('.email-choice');

    const component = fixture.componentInstance as unknown as {
      loginForm: { setValue(v: { email: string; password: string }): void };
      onSubmit(): Promise<void>;
    };
    component.loginForm.setValue({ email: 'barn@eksempel.no', password: 'feil' });
    await component.onSubmit();
    fixture.detectChanges();

    expect(text('.error-message[role="alert"]')).toBe('Feil e-post eller passord. Prøv igjen.');
    expect(el.querySelector('#email')?.classList).toContain('error');
    expect(el.querySelector('#password')?.classList).toContain('error');
  });

  it('a scanned code signs the child in and goes to /my-tasks', async () => {
    mockQrAuthService.loginWithQrToken.mockReturnValue(
      of({
        accessToken: 'a',
        refreshToken: 'r',
        userId: 'u1',
        email: 'barn@eksempel.no',
        role: 'child',
        firstName: 'Emma',
        lastName: 'T',
      }),
    );
    const component = fixture.componentInstance as unknown as {
      onQrCodeScanned(token: string): Promise<void>;
    };
    await component.onQrCodeScanned('tok');

    expect(mockQrAuthService.loginWithQrToken).toHaveBeenCalledWith('tok');
    expect(mockTokenService.storeTokens).toHaveBeenCalledWith('a', 'r', 'persistent');
    expect(mockAuthService.isAuthenticated.set).toHaveBeenCalledWith(true);
    expect(router.navigate).toHaveBeenCalledWith(['/my-tasks']);
  });

  it('a refused code returns to the two choices with the QR error line', async () => {
    mockQrAuthService.loginWithQrToken.mockReturnValue(throwError(() => new Error('401')));
    await click('.qr-choice');
    const component = fixture.componentInstance as unknown as {
      onQrCodeScanned(token: string): Promise<void>;
    };
    await component.onQrCodeScanned('bad');
    fixture.detectChanges();

    expect(el.querySelector('.choice-list')).not.toBeNull();
    expect(text('.choice-list .error-message')).toBe(
      'QR-koden virket ikke. Be en voksen om en ny, og prøv igjen.',
    );
    expect(router.navigate).not.toHaveBeenCalled();
  });
});

describe('ChildLoginComponent after a scanned «Etter tur» code (ST-2075)', () => {
  const qrLogin = {
    accessToken: 'a',
    refreshToken: 'r',
    userId: 'u1',
    email: 'barn@eksempel.no',
    role: 'child',
    firstName: 'Emma',
    lastName: 'T',
  };

  function create(returnUrl: string) {
    const scanInfo = vi.fn().mockResolvedValue({ taskName: 'Tømme oppvaskmaskinen' });
    TestBed.configureTestingModule({
      imports: [ChildLoginComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { queryParamMap: convertToParamMap({ returnUrl }) } },
        },
        {
          provide: AuthService,
          useValue: {
            login: vi.fn(),
            currentUser: { set: vi.fn() },
            isAuthenticated: { set: vi.fn() },
          },
        },
        {
          provide: QrAuthService,
          useValue: { loginWithQrToken: vi.fn().mockReturnValue(of(qrLogin)) },
        },
        { provide: TokenService, useValue: { storeTokens: vi.fn() } },
        { provide: TurnService, useValue: { scanInfo } },
        {
          provide: HouseholdService,
          useValue: { autoActivateHousehold: vi.fn().mockResolvedValue(undefined) },
        },
      ],
    });
    const fixture = TestBed.createComponent(ChildLoginComponent);
    const router = TestBed.inject(Router);
    vi.spyOn(router, 'navigate').mockResolvedValue(true);
    vi.spyOn(router, 'navigateByUrl').mockResolvedValue(true);
    fixture.detectChanges();
    return { fixture, router, scanInfo };
  }

  it('names the chore that waits, then goes back to the scan page to finish it', async () => {
    const { fixture, router, scanInfo } = create('/s/4KQ7MF');
    await fixture.whenStable();
    fixture.detectChanges();
    expect(scanInfo).toHaveBeenCalledWith('4KQ7MF');
    expect(fixture.nativeElement.querySelector('.subtitle').textContent.trim()).toBe(
      'Logg inn for å fullføre: Tømme oppvaskmaskinen',
    );

    const component = fixture.componentInstance as unknown as {
      onQrCodeScanned(token: string): Promise<void>;
    };
    await component.onQrCodeScanned('tok');
    expect(router.navigateByUrl).toHaveBeenCalledWith('/s/4KQ7MF');
    expect(router.navigate).not.toHaveBeenCalled();
  });

  it('follows only a scan page, never another address', async () => {
    const { fixture, router, scanInfo } = create('https://evil.example/s/4KQ7MF');
    expect(scanInfo).not.toHaveBeenCalled();
    const component = fixture.componentInstance as unknown as {
      onQrCodeScanned(token: string): Promise<void>;
    };
    await component.onQrCodeScanned('tok');
    expect(router.navigate).toHaveBeenCalledWith(['/my-tasks']);
    expect(router.navigateByUrl).not.toHaveBeenCalled();
  });
});
