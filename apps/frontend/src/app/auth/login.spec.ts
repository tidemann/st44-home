import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { LoginComponent } from './login';
import { AuthService } from '../services/auth.service';
import { HouseholdService } from '../services/household.service';
import { Router, ActivatedRoute, provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';

describe('LoginComponent', () => {
  let component: LoginComponent;
  let fixture: ComponentFixture<LoginComponent>;
  let mockAuthService: { login: ReturnType<typeof vi.fn> };
  let mockHouseholdService: { autoActivateHousehold: ReturnType<typeof vi.fn> };
  let router: Router;
  let mockActivatedRoute: {
    snapshot: {
      queryParams: Record<string, string>;
    };
  };

  beforeEach(() => {
    // Clear storage before tests
    localStorage.clear();
    sessionStorage.clear();

    // Create mocks
    mockAuthService = {
      login: vi.fn(),
    };

    mockHouseholdService = {
      autoActivateHousehold: vi.fn().mockResolvedValue(undefined),
    };

    mockActivatedRoute = {
      snapshot: {
        queryParams: {},
      },
    };

    TestBed.configureTestingModule({
      imports: [LoginComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]), // Provides a real Router for testing
        { provide: AuthService, useValue: mockAuthService },
        { provide: HouseholdService, useValue: mockHouseholdService },
        { provide: ActivatedRoute, useValue: mockActivatedRoute },
      ],
    });

    fixture = TestBed.createComponent(LoginComponent);
    component = fixture.componentInstance;
    router = TestBed.inject(Router);
    vi.spyOn(router, 'navigateByUrl');
    fixture.detectChanges();
  });

  describe('Component Initialization', () => {
    it('should create', () => {
      expect(component).toBeTruthy();
    });

    it('should initialize form with empty values and rememberMe=false', () => {
      expect(component['loginForm'].value).toEqual({
        email: '',
        password: '',
        rememberMe: false,
      });
    });

    it('should initialize signals with default values', () => {
      expect(component['showPassword']()).toBe(false);
      expect(component['isLoading']()).toBe(false);
      expect(component['errorMessage']()).toBe(null);
      expect(component['justRegistered']()).toBe(false);
    });

    it('should detect just registered from query params', () => {
      mockActivatedRoute.snapshot.queryParams = { registered: 'true' };

      const newFixture = TestBed.createComponent(LoginComponent);
      const newComponent = newFixture.componentInstance;

      expect(newComponent['justRegistered']()).toBe(true);
    });
  });

  describe('Form Validation', () => {
    it('should mark email as invalid when empty', () => {
      const emailControl = component['emailControl'];
      emailControl.markAsTouched();

      expect(emailControl.invalid).toBe(true);
      expect(emailControl.hasError('required')).toBe(true);
    });

    it('should mark email as invalid when format is wrong', () => {
      const emailControl = component['emailControl'];
      emailControl.setValue('not-an-email');
      emailControl.markAsTouched();

      expect(emailControl.invalid).toBe(true);
      expect(emailControl.hasError('email')).toBe(true);
    });

    it('should mark email as valid when format is correct', () => {
      const emailControl = component['emailControl'];
      emailControl.setValue('test@example.com');

      expect(emailControl.valid).toBe(true);
    });

    it('should mark password as invalid when empty', () => {
      const passwordControl = component['passwordControl'];
      passwordControl.markAsTouched();

      expect(passwordControl.invalid).toBe(true);
      expect(passwordControl.hasError('required')).toBe(true);
    });

    it('should mark password as valid when not empty', () => {
      const passwordControl = component['passwordControl'];
      passwordControl.setValue('Test1234');

      expect(passwordControl.valid).toBe(true);
    });

    it('should mark form as invalid when fields are empty', () => {
      expect(component['loginForm'].invalid).toBe(true);
    });

    it('should mark form as valid when all fields are filled correctly', () => {
      component['loginForm'].patchValue({
        email: 'test@example.com',
        password: 'Test1234',
        rememberMe: false,
      });

      expect(component['loginForm'].valid).toBe(true);
    });
  });

  describe('Password Visibility Toggle', () => {
    it('should toggle showPassword signal from false to true', () => {
      expect(component['showPassword']()).toBe(false);
      component['togglePasswordVisibility']();
      expect(component['showPassword']()).toBe(true);
    });

    it('should toggle showPassword signal from true to false', () => {
      component['showPassword'].set(true);
      component['togglePasswordVisibility']();
      expect(component['showPassword']()).toBe(false);
    });
  });

  describe('Form Submission', () => {
    it('should not submit when form is invalid', async () => {
      await component['onSubmit']();

      expect(mockAuthService.login).not.toHaveBeenCalled();
      expect(router.navigateByUrl).not.toHaveBeenCalled();
    });

    it('should call authService.login with correct parameters', async () => {
      component['loginForm'].patchValue({
        email: 'test@example.com',
        password: 'Test1234',
        rememberMe: true,
      });

      mockAuthService.login.mockReturnValue(of({ userId: '1', email: 'test@example.com' }));

      await component['onSubmit']();

      expect(mockAuthService.login).toHaveBeenCalledWith('test@example.com', 'Test1234', true);
    });

    it('should navigate to home on successful login without returnUrl', async () => {
      component['loginForm'].patchValue({
        email: 'test@example.com',
        password: 'Test1234',
        rememberMe: false,
      });

      mockAuthService.login.mockReturnValue(of({ userId: '1', email: 'test@example.com' }));

      await component['onSubmit']();

      expect(router.navigateByUrl).toHaveBeenCalledWith('/home');
    });

    it('should navigate to returnUrl on successful login when provided', async () => {
      mockActivatedRoute.snapshot.queryParams = { returnUrl: '/profile' };

      component['loginForm'].patchValue({
        email: 'test@example.com',
        password: 'Test1234',
        rememberMe: false,
      });

      mockAuthService.login.mockReturnValue(of({ userId: '1', email: 'test@example.com' }));

      await component['onSubmit']();

      expect(router.navigateByUrl).toHaveBeenCalledWith('/profile');
    });

    it('should set isLoading to true during login', async () => {
      component['loginForm'].patchValue({
        email: 'test@example.com',
        password: 'Test1234',
      });

      // Mock login to return a promise that doesn't resolve immediately
      let resolveLogin: (value: unknown) => void;
      const loginPromise = new Promise((resolve) => {
        resolveLogin = resolve;
      });
      mockAuthService.login.mockReturnValue(loginPromise);

      const submitPromise = component['onSubmit']();

      // Should be loading
      expect(component['isLoading']()).toBe(true);

      // Resolve login and wait
      resolveLogin!({ userId: '1', email: 'test@example.com' });
      await submitPromise;

      // Should no longer be loading
      expect(component['isLoading']()).toBe(false);
    });

    it('should clear errorMessage on new submission', async () => {
      component['errorMessage'].set('Previous error');
      component['loginForm'].patchValue({
        email: 'test@example.com',
        password: 'Test1234',
      });

      mockAuthService.login.mockReturnValue(of({ userId: '1', email: 'test@example.com' }));

      await component['onSubmit']();

      expect(component['errorMessage']()).toBe(null);
    });

    it('should show one line and mark both fields when the e-mail or password is wrong', async () => {
      component['loginForm'].patchValue({
        email: 'test@example.com',
        password: 'WrongPassword',
      });

      mockAuthService.login.mockReturnValue(
        throwError(() => ({ status: 401, error: { error: 'Invalid email or password' } })),
      );

      await component['onSubmit']();

      expect(component['errorMessage']()).toBe('Feil e-post eller passord. Prøv igjen.');
      expect(component['emailInvalid']()).toBe(true);
      expect(component['passwordInvalid']()).toBe(true);
      expect(component['isLoading']()).toBe(false);
      expect(router.navigateByUrl).not.toHaveBeenCalled();
    });

    it('should say so in Norwegian when there are too many attempts', async () => {
      component['loginForm'].patchValue({
        email: 'test@example.com',
        password: 'Test1234',
      });

      mockAuthService.login.mockReturnValue(throwError(() => ({ status: 429 })));

      await component['onSubmit']();

      expect(component['errorMessage']()).toBe('For mange forsøk. Vent litt, og prøv igjen.');
      expect(component['emailInvalid']()).toBe(false);
    });

    it('should show a Norwegian fallback for any other failure, without blaming the fields', async () => {
      component['loginForm'].patchValue({
        email: 'test@example.com',
        password: 'WrongPassword',
      });

      mockAuthService.login.mockReturnValue(throwError(() => ({})));

      await component['onSubmit']();

      expect(component['errorMessage']()).toBe(
        'Vi fikk ikke logget deg inn. Sjekk nettet, og prøv igjen.',
      );
      expect(component['emailInvalid']()).toBe(false);
      expect(component['passwordInvalid']()).toBe(false);
    });

    it('should default rememberMe to false if not set', async () => {
      component['loginForm'].patchValue({
        email: 'test@example.com',
        password: 'Test1234',
        // rememberMe not set, will be null
      });

      mockAuthService.login.mockReturnValue(of({ userId: '1', email: 'test@example.com' }));

      await component['onSubmit']();

      expect(mockAuthService.login).toHaveBeenCalledWith('test@example.com', 'Test1234', false);
    });
  });

  describe('The approved login states', () => {
    const el = () => fixture.nativeElement as HTMLElement;

    it('should draw the brand area with the mark, the wordmark and the claim', () => {
      expect(el().querySelector('.brand app-diddit-mark')).toBeTruthy();
      expect(el().querySelector('.wordmark')?.textContent?.trim()).toBe('Diddit');
      expect(el().querySelector('.claim')?.textContent?.trim()).toBe('Gjort er gjort.');
    });

    it('should keep the labels above the fields, with no placeholders', () => {
      const email = el().querySelector('#email') as HTMLInputElement;
      const password = el().querySelector('#password') as HTMLInputElement;
      expect(el().querySelector('label[for="email"]')?.textContent?.trim()).toBe('E-post');
      expect(el().querySelector('label[for="password"]')?.textContent?.trim()).toBe('Passord');
      expect(email.placeholder).toBe('');
      expect(password.placeholder).toBe('');
      expect(email.getAttribute('autocomplete')).toBe('username');
      expect(password.getAttribute('autocomplete')).toBe('current-password');
    });

    it('should leave «Logg inn» enabled on an empty form and validate on press', async () => {
      const button = el().querySelector('button[type="submit"]') as HTMLButtonElement;
      expect(button.disabled).toBe(false);

      await component['onSubmit']();
      fixture.detectChanges();

      expect(mockAuthService.login).not.toHaveBeenCalled();
      expect(component['errorMessage']()).toBe('Skriv inn e-post og passord.');
      const line = el().querySelector('#login-error');
      expect(line?.getAttribute('role')).toBe('alert');
      expect(el().querySelector('#email')?.getAttribute('aria-describedby')).toBe('login-error');
      expect(el().querySelector('#password')?.getAttribute('aria-describedby')).toBe('login-error');
    });

    it('should name only the field that is missing', async () => {
      component['loginForm'].patchValue({ email: 'test@example.com' });

      await component['onSubmit']();

      expect(component['errorMessage']()).toBe('Skriv inn passordet ditt.');
      expect(component['emailInvalid']()).toBe(false);
      expect(component['passwordInvalid']()).toBe(true);
    });

    it('should show «Vis passord» only once there is a character to show', () => {
      expect(el().querySelector('.eye')).toBeNull();

      component['loginForm'].controls.password.setValue('a');
      fixture.detectChanges();

      const eye = el().querySelector('.eye') as HTMLButtonElement;
      expect(eye).toBeTruthy();
      expect(eye.getAttribute('aria-label')).toBe('Vis passord');
    });

    it('should keep the yellow button and swap its label while signing in', async () => {
      component['loginForm'].patchValue({ email: 'test@example.com', password: 'Test1234' });
      mockAuthService.login.mockReturnValue(new Promise(() => undefined));

      void component['onSubmit']();
      fixture.detectChanges();

      const button = el().querySelector('button[type="submit"]') as HTMLButtonElement;
      expect(button.disabled).toBe(false);
      expect(button.getAttribute('aria-busy')).toBe('true');
      expect(button.textContent).toContain('Logger inn');
    });

    it('should ignore a second press while signing in', async () => {
      component['loginForm'].patchValue({ email: 'test@example.com', password: 'Test1234' });
      mockAuthService.login.mockReturnValue(new Promise(() => undefined));

      void component['onSubmit']();
      await component['onSubmit']();

      expect(mockAuthService.login).toHaveBeenCalledTimes(1);
    });

    it('should collapse the brand area while a field has focus', () => {
      vi.useFakeTimers();
      const email = el().querySelector('#email') as HTMLInputElement;

      email.dispatchEvent(new FocusEvent('focusin', { bubbles: true }));
      fixture.detectChanges();
      expect(el().querySelector('.login')?.classList.contains('typing')).toBe(true);

      email.dispatchEvent(new FocusEvent('focusout', { bubbles: true }));
      vi.advanceTimersByTime(400);
      fixture.detectChanges();
      expect(el().querySelector('.login')?.classList.contains('typing')).toBe(false);
      vi.useRealTimers();
    });

    it('should stay collapsed when focus moves from one field to the other', () => {
      vi.useFakeTimers();
      const email = el().querySelector('#email') as HTMLInputElement;
      const password = el().querySelector('#password') as HTMLInputElement;

      email.dispatchEvent(new FocusEvent('focusin', { bubbles: true }));
      email.dispatchEvent(new FocusEvent('focusout', { bubbles: true, relatedTarget: password }));
      vi.advanceTimersByTime(400);
      fixture.detectChanges();

      expect(component['typing']()).toBe(true);
      vi.useRealTimers();
    });
  });
});
