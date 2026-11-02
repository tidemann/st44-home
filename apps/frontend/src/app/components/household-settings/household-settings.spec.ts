import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { HouseholdSettingsComponent, shortDay } from './household-settings';
import { HouseholdService } from '../../services/household.service';
import { InvitationService, type Invitation } from '../../services/invitation.service';
import { ConfirmDialogService } from '../../services/confirm-dialog.service';

describe('HouseholdSettingsComponent («Invitasjoner til husstanden»)', () => {
  let fixture: ComponentFixture<HouseholdSettingsComponent>;
  let el: HTMLElement;
  let household: {
    getActiveHouseholdId: ReturnType<typeof vi.fn>;
    getHousehold: ReturnType<typeof vi.fn>;
  };
  let invitations: {
    sendInvitation: ReturnType<typeof vi.fn>;
    listSentInvitations: ReturnType<typeof vi.fn>;
    cancelInvitation: ReturnType<typeof vi.fn>;
    cleanupInvitations: ReturnType<typeof vi.fn>;
  };
  let confirm: { confirm: ReturnType<typeof vi.fn> };

  const day = 24 * 60 * 60 * 1000;
  const inv = (over: Partial<Invitation>): Invitation => ({
    id: 'i1',
    householdId: 'h1',
    invitedEmail: 'per.hansen@eksempel.no',
    invitedBy: 'u1',
    role: 'parent',
    status: 'pending',
    expiresAt: new Date(Date.now() + 7 * day).toISOString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...over,
  });

  async function render(): Promise<void> {
    fixture = TestBed.createComponent(HouseholdSettingsComponent);
    el = fixture.nativeElement;
    await fixture.componentInstance.ngOnInit();
    fixture.detectChanges();
  }

  const text = (selector: string): string[] =>
    [...el.querySelectorAll(selector)].map((n) =>
      (n.textContent ?? '').replace(/\s+/g, ' ').trim(),
    );

  function type(email: string): void {
    const input = el.querySelector<HTMLInputElement>('#iv-email')!;
    input.value = email;
    input.dispatchEvent(new Event('input'));
  }

  function chooseRole(value: 'parent' | 'admin'): void {
    el.querySelector<HTMLInputElement>(`input[name="iv-role"][value="${value}"]`)!.click();
    fixture.detectChanges();
  }

  async function submit(): Promise<void> {
    el.querySelector<HTMLFormElement>('form')!.dispatchEvent(new Event('submit'));
    await fixture.whenStable();
    await new Promise((r) => setTimeout(r));
    fixture.detectChanges();
  }

  beforeEach(async () => {
    household = {
      getActiveHouseholdId: vi.fn().mockReturnValue('h1'),
      getHousehold: vi
        .fn()
        .mockResolvedValue({ id: 'h1', name: 'Familien Nordmann', role: 'admin' }),
    };
    invitations = {
      sendInvitation: vi.fn().mockResolvedValue({ id: 'n1', token: 'tok-1' }),
      listSentInvitations: vi.fn().mockResolvedValue({ invitations: [] }),
      cancelInvitation: vi.fn().mockResolvedValue(undefined),
      cleanupInvitations: vi.fn().mockResolvedValue({ deleted: 1, message: '' }),
    };
    confirm = { confirm: vi.fn().mockResolvedValue(true) };

    await TestBed.configureTestingModule({
      imports: [HouseholdSettingsComponent],
      providers: [
        provideRouter([]),
        { provide: HouseholdService, useValue: household },
        { provide: InvitationService, useValue: invitations },
        { provide: ConfirmDialogService, useValue: confirm },
      ],
    }).compileComponents();
  });

  it('shows the title, the household name and nothing about members or children', async () => {
    await render();
    expect(text('h1')[0]).toBe('Invitasjoner til husstanden');
    expect(el.textContent).toContain('Familien Nordmann');
    expect(text('h2')).toEqual(['Ny invitasjon', 'Sendte invitasjoner']);
    expect(el.textContent).not.toContain('Barn');
    expect(el.querySelector('input#household-name')).toBeNull();
  });

  it('offers exactly two roles, «Forelder» first and chosen', async () => {
    await render();
    expect(text('.iv-chip')).toEqual(['Forelder', 'Administrator']);
    expect(text('.iv-chip.on')).toEqual(['Forelder']);
    expect(el.textContent).not.toContain('Voksen');
  });

  it('sends «Forelder» as parent', async () => {
    await render();
    type('per.hansen@eksempel.no');
    chooseRole('parent');
    await submit();
    expect(invitations.sendInvitation).toHaveBeenCalledWith(
      'h1',
      'per.hansen@eksempel.no',
      'parent',
    );
  });

  it('sends «Administrator» as admin', async () => {
    await render();
    type('mormor@eksempel.no');
    chooseRole('admin');
    expect(text('.iv-chip.on')).toEqual(['Administrator']);
    await submit();
    expect(invitations.sendInvitation).toHaveBeenCalledWith('h1', 'mormor@eksempel.no', 'admin');
  });

  it('checks the address on the press and shows the error under the field', async () => {
    await render();
    type('ikke-en-adresse');
    await submit();
    expect(invitations.sendInvitation).not.toHaveBeenCalled();
    expect(text('.iv-error')).toEqual(['Skriv en gyldig e-postadresse.']);
  });

  it('says «allerede invitert» on a 409', async () => {
    invitations.sendInvitation.mockRejectedValue({
      status: 409,
      error: { message: 'A pending invitation already exists' },
    });
    await render();
    type('per.hansen@eksempel.no');
    await submit();
    expect(text('.iv-error')).toEqual(['Denne adressen er allerede invitert.']);
  });

  it('after a send shows the receipt, the accept link and «Kopier lenke»', async () => {
    await render();
    type('per.hansen@eksempel.no');
    await submit();
    expect(text('.iv-ok')[0]).toBe(
      'Invitasjonen er sendt til per.hansen@eksempel.no. Den gjelder i sju dager.',
    );
    expect(text('.iv-link')[0]).toMatch(/\/invitations\/accept\/tok-1$/);
    expect(text('.iv-form .iv-outbtn')).toEqual(['Kopier lenke']);
  });

  it('shows the shared empty card when nothing is sent', async () => {
    await render();
    expect(text('.iv-empty-t')).toEqual(['Ingen invitasjoner sendt']);
    expect(el.querySelector('.iv-count')).toBeNull();
  });

  it('draws a pending card with «Trekk tilbake» and an expired one without', async () => {
    invitations.listSentInvitations.mockResolvedValue({
      invitations: [
        inv({ id: 'a', role: 'admin' }),
        inv({
          id: 'b',
          invitedEmail: 'ola@eksempel.no',
          expiresAt: new Date(Date.now() - day).toISOString(),
        }),
        inv({ id: 'c', status: 'cancelled' }),
        inv({ id: 'd', status: 'accepted' }),
      ],
    });
    await render();
    expect(text('.iv-count')).toEqual(['2']);
    expect(text('.iv-stat')).toEqual(['Venter', 'Utløpt']);
    expect(text('.iv-r2')[0]).toMatch(/^Administrator · sendt i dag · utløper /);
    expect(text('.iv-r2')[1]).toMatch(/^Forelder · sendt i dag · utløp /);
    expect(text('.iv-card .iv-outbtn')).toEqual(['Trekk tilbake']);
    expect(text('.iv-cleanup')).toEqual(['Rydd opp gamle']);
  });

  it('withdraws without a confirm and announces it', async () => {
    invitations.listSentInvitations.mockResolvedValue({ invitations: [inv({ id: 'a' })] });
    await render();
    el.querySelector<HTMLButtonElement>('.iv-card .iv-outbtn')!.click();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(confirm.confirm).not.toHaveBeenCalled();
    expect(invitations.cancelInvitation).toHaveBeenCalledWith('h1', 'a');
    expect(el.querySelectorAll('.iv-card:not(.iv-empty)').length).toBe(0);
    expect(el.textContent).toContain('Invitasjonen til per.hansen@eksempel.no er trukket tilbake.');
  });

  it('shows rule 7 grey rows while loading, and the error card with «Prøv igjen»', async () => {
    let fail!: (e: unknown) => void;
    invitations.listSentInvitations.mockReturnValue(new Promise((_, reject) => (fail = reject)));
    fixture = TestBed.createComponent(HouseholdSettingsComponent);
    el = fixture.nativeElement;
    const init = fixture.componentInstance.ngOnInit();
    await new Promise((r) => setTimeout(r));
    fixture.detectChanges();
    expect(el.querySelectorAll('.iv-skeleton').length).toBe(3);

    fail(new Error('down'));
    await init;
    fixture.detectChanges();
    expect(text('.iv-empty-t')).toEqual(['Vi fikk ikke hentet invitasjonene']);
    expect(text('.iv-retry')).toEqual(['Prøv igjen']);
  });

  it('sends a non-admin to «Familie»', async () => {
    household.getHousehold.mockResolvedValue({ id: 'h1', name: 'X', role: 'parent' });
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    await render();
    expect(navigate).toHaveBeenCalledWith(['/family']);
    expect(el.querySelector('form')).toBeNull();
  });

  it('writes a date as «9. nov.» and today as «i dag»', () => {
    const now = new Date(2026, 10, 2, 12);
    expect(shortDay(new Date(2026, 10, 9, 10).toISOString(), now)).toBe('9. nov.');
    expect(shortDay(new Date(2026, 10, 2, 8).toISOString(), now)).toBe('i dag');
  });
});
