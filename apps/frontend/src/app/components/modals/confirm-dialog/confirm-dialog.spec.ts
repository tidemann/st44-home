import { describe, it, expect, beforeEach } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ConfirmDialog } from './confirm-dialog';
import { ConfirmDialogService } from '../../../services/confirm-dialog.service';

describe('ConfirmDialog', () => {
  let fixture: ComponentFixture<ConfirmDialog>;
  let service: ConfirmDialogService;
  let el: HTMLElement;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [ConfirmDialog] }).compileComponents();
    fixture = TestBed.createComponent(ConfirmDialog);
    service = TestBed.inject(ConfirmDialogService);
    el = fixture.nativeElement as HTMLElement;
    fixture.detectChanges();
  });

  const buttons = () => Array.from(el.querySelectorAll<HTMLButtonElement>('.popup-actions .btn'));

  it('renders nothing until asked', () => {
    expect(el.querySelector('.modal')).toBeNull();
  });

  it('shows the question with the safe answer left and a rust «Slett» right', async () => {
    const answer = service.confirm({
      title: 'Slette oppgaven?',
      message: '«Søppel og pant ut» forsvinner for hele familien.',
      confirmLabel: 'Slett',
      danger: true,
    });
    fixture.detectChanges();

    expect(el.querySelector('.modal-title')?.textContent).toContain('Slette oppgaven?');
    expect(el.querySelector('.modal-close')).toBeNull();
    const [cancel, act] = buttons();
    expect(cancel.textContent?.trim()).toBe('Avbryt');
    expect(cancel.classList).toContain('btn-secondary');
    expect(act.textContent?.trim()).toBe('Slett');
    expect(act.classList).toContain('btn-danger');

    act.click();
    expect(await answer).toBe(true);
  });

  it('a question that does not destroy gets the primary fill', () => {
    void service.confirm({ title: 't', message: 'm', confirmLabel: 'Bli med' });
    fixture.detectChanges();
    const [, act] = buttons();
    expect(act.classList).toContain('btn-primary');
    expect(act.classList).not.toContain('btn-danger');
  });

  it('«Avbryt» answers no', async () => {
    const answer = service.confirm({ title: 't', message: 'm', confirmLabel: 'OK' });
    fixture.detectChanges();
    buttons()[0].click();
    expect(await answer).toBe(false);
  });
});
