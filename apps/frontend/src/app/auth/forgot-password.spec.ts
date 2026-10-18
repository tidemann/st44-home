import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { vi } from 'vitest';
import { ForgotPasswordComponent } from './forgot-password';
import { AuthService } from '../services/auth.service';

describe('ForgotPasswordComponent', () => {
  let fixture: ComponentFixture<ForgotPasswordComponent>;
  let el: HTMLElement;
  const forgotPassword = vi.fn(() => of({}));

  beforeEach(async () => {
    forgotPassword.mockClear();
    await TestBed.configureTestingModule({
      imports: [ForgotPasswordComponent],
      providers: [provideRouter([]), { provide: AuthService, useValue: { forgotPassword } }],
    }).compileComponents();
    fixture = TestBed.createComponent(ForgotPasswordComponent);
    el = fixture.nativeElement;
    fixture.detectChanges();
  });

  it('keeps the main button pressable on an empty form (rule 6)', () => {
    const button = el.querySelector('button[type="submit"]') as HTMLButtonElement;
    expect(button.disabled).toBe(false);
  });

  it('checks the form on press: no request, the error under the field', () => {
    (el.querySelector('form') as HTMLFormElement).dispatchEvent(new Event('submit'));
    fixture.detectChanges();
    expect(forgotPassword).not.toHaveBeenCalled();
    expect(el.querySelector('#email-error')?.textContent).toContain('Skriv inn e-postadressen din');
  });

  it('sends the link when the e-mail is valid', () => {
    const input = el.querySelector('#email') as HTMLInputElement;
    input.value = 'kari@example.no';
    input.dispatchEvent(new Event('input'));
    (el.querySelector('form') as HTMLFormElement).dispatchEvent(new Event('submit'));
    expect(forgotPassword).toHaveBeenCalledWith('kari@example.no');
  });
});
