import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, convertToParamMap, provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
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
    fixture.detectChanges();
    return (fixture.nativeElement as HTMLElement).textContent ?? '';
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

    await TestBed.configureTestingModule({
      imports: [ChildInviteComponent],
      providers: [
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { paramMap: convertToParamMap({ token: 'tok9' }) } },
        },
        { provide: ChildInvitationService, useValue: { info, accept } },
        { provide: AuthService, useValue: { login } },
        { provide: HouseholdService, useValue: { autoActivateHousehold: vi.fn() } },
      ],
    }).compileComponents();
  });

  it('greets the child by name and names the points waiting', async () => {
    const text = await render(valid);
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
});
