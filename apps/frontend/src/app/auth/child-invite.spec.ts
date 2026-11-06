import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, convertToParamMap, provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { signal } from '@angular/core';
import { HouseholdStore } from '../stores/household.store';
import { ChildInviteComponent } from './child-invite';
import { AuthService } from '../services/auth.service';
import { HouseholdService } from '../services/household.service';
import {
  ChildInvitationService,
  type ChildInvitationInfo,
} from '../services/child-invitation.service';

describe('ChildInviteComponent («Lag passordet ditt»)', () => {
  let fixture: ComponentFixture<ChildInviteComponent>;
  let info: ReturnType<typeof vi.fn>;
  let accept: ReturnType<typeof vi.fn>;
  let login: ReturnType<typeof vi.fn>;
  let router: Router;
  let existing: ReturnType<typeof vi.fn>;
  let acceptExisting: ReturnType<typeof vi.fn>;
  let logout: ReturnType<typeof vi.fn>;
  let authed: boolean;
  let store: {
    households: ReturnType<typeof signal>;
    loadHouseholds: ReturnType<typeof vi.fn>;
    setActiveHousehold: ReturnType<typeof vi.fn>;
  };

  const valid: ChildInvitationInfo = {
    state: 'valid',
    inviterName: 'Kari',
    expiresAt: '2026-10-27T10:00:00Z',
    email: 'mathea@eksempel.no',
    childName: 'Mathea',
    householdName: 'Familien Nordmann',
    points: 35,
  };

  async function render(found: ChildInvitationInfo | Error) {
    if (found instanceof Error) info.mockRejectedValue(found);
    else info.mockResolvedValue(found);
    fixture = TestBed.createComponent(ChildInviteComponent);
    router = TestBed.inject(Router);
    vi.spyOn(router, 'navigateByUrl').mockResolvedValue(true);
    vi.spyOn(router, 'navigate').mockResolvedValue(true);
    fixture.detectChanges();
    await fixture.whenStable();
    // The signed-in path waits for two answers (the link, then the account check)
    for (let i = 0; i < 3; i++) await new Promise((r) => setTimeout(r));
    fixture.detectChanges();
    return (fixture.nativeElement as HTMLElement).textContent ?? '';
  }

  /** «Lag passord» on the invitation: the ST-1678 form */
  async function toPassword() {
    const button = [...fixture.nativeElement.querySelectorAll('button')].find(
      (b: HTMLButtonElement) => b.textContent?.trim() === 'Lag passord',
    ) as HTMLButtonElement;
    button.click();
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    return (fixture.nativeElement as HTMLElement).textContent ?? '';
  }

  function press(label: string) {
    const button = [...fixture.nativeElement.querySelectorAll('button')].find(
      (b: HTMLButtonElement) => b.textContent?.replace(/\s+/g, ' ').trim().startsWith(label),
    ) as HTMLButtonElement;
    expect(button, label).toBeTruthy();
    button.click();
  }

  function type(id: string, value: string) {
    const input = fixture.nativeElement.querySelector(id) as HTMLInputElement;
    input.value = value;
    input.dispatchEvent(new Event('input'));
  }

  beforeEach(async () => {
    info = vi.fn();
    accept = vi.fn().mockResolvedValue({ email: 'mathea@eksempel.no' });
    login = vi.fn().mockReturnValue(of({}));
    existing = vi.fn();
    acceptExisting = vi.fn();
    logout = vi.fn();
    authed = false;
    store = {
      households: signal([]),
      loadHouseholds: vi.fn().mockResolvedValue([]),
      setActiveHousehold: vi.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [ChildInviteComponent],
      providers: [
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { paramMap: convertToParamMap({ token: 'tok9' }) } },
        },
        { provide: ChildInvitationService, useValue: { info, accept, existing, acceptExisting } },
        {
          provide: AuthService,
          useValue: {
            login,
            logout,
            isAuthenticated: () => authed,
            currentUser: () => (authed ? { email: 'jonas.nordmann@gmail.com' } : null),
          },
        },
        { provide: HouseholdStore, useValue: store },
        { provide: HouseholdService, useValue: { autoActivateHousehold: vi.fn() } },
      ],
    }).compileComponents();
  });

  it('greets the child by name and names the points waiting', async () => {
    await render(valid);
    const text = await toPassword();
    expect(info).toHaveBeenCalledWith('tok9');
    expect(text).toContain('Lag passordet ditt');
    expect(text).toContain(
      'Hei Mathea! Kari har invitert deg inn i Familien Nordmann. Velg et passord, så er du i gang.',
    );
    expect(text).toContain('Passord');
    expect(text).toContain('Gjenta passordet');
    expect(text).toContain('Lag passordet');
    expect(text).toContain('Poengene dine (35 p) og oppgavene dine ligger klare.');
    expect(text).not.toContain('E-post');
  });

  it('different passwords: the page’s own line under the second field', async () => {
    await render(valid);
    await toPassword();
    type('#newPassword', 'Passord123');
    type('#confirmPassword', 'Passord124');
    fixture.nativeElement.querySelector('form').dispatchEvent(new Event('submit'));
    await fixture.whenStable();
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Passordene samsvarer ikke');
    expect(accept).not.toHaveBeenCalled();
  });

  it('sets the password, logs straight in and lands in «Mine oppgaver»', async () => {
    await render(valid);
    await toPassword();
    type('#newPassword', 'Passord123');
    type('#confirmPassword', 'Passord123');
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Sterkt passord');
    fixture.nativeElement.querySelector('form').dispatchEvent(new Event('submit'));
    await fixture.whenStable();
    expect(accept).toHaveBeenCalledWith('tok9', 'Passord123');
    expect(login).toHaveBeenCalledWith('mathea@eksempel.no', 'Passord123');
    expect(router.navigateByUrl).toHaveBeenCalledWith('/my-tasks');
  });

  it('if the automatic login fails, the login page takes over', async () => {
    login.mockReturnValue(throwError(() => ({ status: 429 })));
    await render(valid);
    await toPassword();
    type('#newPassword', 'Passord123');
    type('#confirmPassword', 'Passord123');
    fixture.nativeElement.querySelector('form').dispatchEvent(new Event('submit'));
    await fixture.whenStable();
    expect(router.navigate).toHaveBeenCalledWith(['/login']);
  });

  it('an expired link: one title, one sentence, no button', async () => {
    const text = await render({
      state: 'expired',
      inviterName: 'Kari',
      expiresAt: '2026-10-17T10:00:00Z',
    });
    expect(text).toContain('Lenken virker ikke lenger');
    expect(text).toContain(
      'Invitasjonen fra Kari utløp 17. oktober. Be om en ny — poengene og oppgavene dine ligger trygt der de er.',
    );
    expect(fixture.nativeElement.querySelectorAll('h1').length).toBe(1);
    expect(fixture.nativeElement.querySelector('.reset-body button, .reset-body a')).toBeNull();
  });

  it('a used link: the title, the sentence and «Logg inn»', async () => {
    const text = await render({ state: 'used', inviterName: 'Kari', expiresAt: '' });
    expect(text).toContain('Lenken er brukt');
    expect(text).toContain('Du har allerede laget passordet ditt. Logg inn med e-posten din.');
    const link = fixture.nativeElement.querySelector('.login-link') as HTMLAnchorElement;
    expect(link.textContent?.trim()).toBe('Logg inn');
    expect(link.getAttribute('href')).toBe('/login');
  });

  it('an unknown link is a dead link, never a blank page', async () => {
    const text = await render(new Error('404'));
    expect(text).toContain('Lenken virker ikke lenger');
    expect(text).toContain('Be den voksne som inviterte deg om en ny lenke.');
  });

  // ===== ST-2227: an existing Google account =====

  const eligible = {
    householdName: 'Familien Nordmann',
    childName: 'Mathea',
    points: 35,
    inviterName: 'Kari',
    signedInEmail: 'mathea@eksempel.no',
    role: 'child',
  };

  function refusal(status: number, body: Record<string, unknown>) {
    return Object.assign(new Error(String(status)), { status, error: body });
  }

  it('not signed in: the invitation, a masked e-mail, Google — and nothing accepted', async () => {
    const text = await render(valid);
    expect(text).toContain('Invitasjon');
    expect(text).toContain('Du er invitert inn i Familien Nordmann');
    expect(text).toContain('Kari vil koble kontoen din til profilen Mathea.');
    expect(text).toContain('Mathea · 35 poeng');
    expect(text).toContain('Rolle her');
    expect(text).toContain('Invitasjonen gjelder ma•••@eksempel.no.');
    expect(text).not.toContain('mathea@eksempel.no');
    press('Fortsett med Google');
    expect(router.navigate).toHaveBeenCalledWith(['/login'], {
      queryParams: { returnUrl: '/invitasjon/tok9' },
    });
    expect(existing).not.toHaveBeenCalled();
    expect(acceptExisting).not.toHaveBeenCalled();
  });

  it('signed in with the invited Google account: consent names household, profile and role', async () => {
    authed = true;
    existing.mockResolvedValue(eligible);
    store.households.set([{ id: 'own', name: 'Mathea sin husstand', role: 'admin' }]);
    const text = await render(valid);
    expect(existing).toHaveBeenCalledWith('tok9');
    expect(text).toContain('Bli med som barn?');
    expect(text).toContain('Logget inn som mathea@eksempel.no');
    expect(text).toContain('Du blir barn i Familien Nordmann.');
    expect(text).toContain('Poeng og historikk på profilen Mathea blir der de er.');
    expect(text).toContain('Du er fortsatt administrator i Mathea sin husstand.');
    expect(text).toContain('Godta: bli barn i Familien Nordmann');
    expect(acceptExisting).not.toHaveBeenCalled();
  });

  it('«Godta» links once, opens the family as child and passes the toast', async () => {
    authed = true;
    existing.mockResolvedValue(eligible);
    acceptExisting.mockResolvedValue({
      householdId: 'fam',
      householdName: 'Familien Nordmann',
      childId: 'c1',
      childName: 'Mathea',
      role: 'child',
    });
    await render(valid);
    press('Godta');
    await fixture.whenStable();
    for (let i = 0; i < 3; i++) await new Promise((r) => setTimeout(r));
    expect(acceptExisting).toHaveBeenCalledTimes(1);
    expect(store.loadHouseholds).toHaveBeenCalledWith({ forceRefresh: true });
    expect(store.setActiveHousehold).toHaveBeenCalledWith('fam');
    expect(router.navigateByUrl).toHaveBeenCalledWith('/my-tasks', {
      state: { linkedHousehold: 'Familien Nordmann' },
    });
  });

  it('«Avslå» changes nothing', async () => {
    authed = true;
    existing.mockResolvedValue(eligible);
    await render(valid);
    press('Avslå');
    expect(acceptExisting).not.toHaveBeenCalled();
    expect(router.navigateByUrl).toHaveBeenCalledWith('/');
  });

  it('a different account: «Feil konto», and «Bytt Google-konto» comes back here', async () => {
    authed = true;
    existing.mockRejectedValue(
      refusal(403, {
        code: 'WRONG_ACCOUNT',
        householdName: 'Familien Nordmann',
        signedInEmail: 'jonas.jobb@firma.no',
      }),
    );
    const text = await render(valid);
    expect(text).toContain('Feil konto');
    expect(text).toContain('Logget inn som jonas.jobb@firma.no.');
    expect(text).toContain('gjelder ma•••@eksempel.no');
    expect(fixture.nativeElement.querySelector('[role="alert"]')).toBeTruthy();
    press('Bytt Google-konto');
    expect(logout).toHaveBeenCalledWith('/invitasjon/tok9');
  });

  it('already a parent there: refused, the role is named, no role change offered', async () => {
    authed = true;
    existing.mockRejectedValue(
      refusal(409, {
        code: 'ALREADY_MEMBER',
        householdName: 'Familien Nordmann',
        householdId: 'fam',
        role: 'parent',
      }),
    );
    const text = await render(valid);
    expect(text).toContain('Kan ikke godtas');
    expect(text).toContain('Du er allerede forelder her');
    expect(text).toContain('Diddit bytter ikke rolle automatisk.');
    expect(text).not.toContain('Godta:');
  });

  it('a profile that already has an account: refused, nothing changed', async () => {
    authed = true;
    existing.mockRejectedValue(
      refusal(409, {
        code: 'PROFILE_LINKED',
        householdName: 'Familien Nordmann',
        childName: 'Mathea',
      }),
    );
    const text = await render(valid);
    expect(text).toContain('Profilen er allerede koblet');
    expect(text).toContain('Ingenting er endret.');
  });

  it('a press that loses the race reads as a used link, nothing changed', async () => {
    authed = true;
    existing.mockResolvedValue(eligible);
    acceptExisting.mockRejectedValue(refusal(410, { code: 'USED', inviterName: 'Kari' }));
    await render(valid);
    press('Godta');
    await fixture.whenStable();
    for (let i = 0; i < 3; i++) await new Promise((r) => setTimeout(r));
    fixture.detectChanges();
    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('Invitasjonen er allerede brukt');
    expect(text).toContain('Ingenting er endret på kontoen din.');
    expect(router.navigateByUrl).not.toHaveBeenCalledWith('/my-tasks', expect.anything());
  });

  it('the password form says so when the e-mail already has an account', async () => {
    accept.mockRejectedValue(refusal(409, { error: 'ACCOUNT_EXISTS' }));
    await render(valid);
    await toPassword();
    type('#newPassword', 'Passord123');
    type('#confirmPassword', 'Passord123');
    fixture.nativeElement.querySelector('form').dispatchEvent(new Event('submit'));
    await fixture.whenStable();
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain(
      'Denne e-posten har allerede en Diddit-konto.',
    );
  });
});
