import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { LoginComponent } from './login.component';
import { AuthService } from '../services/auth.service';
import { Router, ActivatedRoute, provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';

describe('LoginComponent', () => {
  let component: LoginComponent;
  let fixture: ComponentFixture<LoginComponent>;
  let mockAuthService: { login: ReturnType<typeof vi.fn> };
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

    it('should navigate to household creation page on successful login without returnUrl', async () => {
      component['loginForm'].patchValue({
        email: 'test@example.com',
        password: 'Test1234',
        rememberMe: false,
      });

      mockAuthService.login.mockReturnValue(of({ userId: '1', email: 'test@example.com' }));

      await component['onSubmit']();

      expect(router.navigateByUrl).toHaveBeenCalledWith('/household/create');
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

    it('should handle login error with error.error property', async () => {
      component['loginForm'].patchValue({
        email: 'test@example.com',
        password: 'WrongPassword',
      });

      mockAuthService.login.mockReturnValue(
        throwError(() => ({
          error: { error: 'Invalid credentials' },
        })),
      );

      await component['onSubmit']();

      expect(component['errorMessage']()).toBe('Invalid credentials');
      expect(component['isLoading']()).toBe(false);
      expect(router.navigateByUrl).not.toHaveBeenCalled();
    });

    it('should handle login error with error.message property', async () => {
      component['loginForm'].patchValue({
        email: 'test@example.com',
        password: 'WrongPassword',
      });

      mockAuthService.login.mockReturnValue(
        throwError(() => ({
          error: { message: 'Server error' },
        })),
      );

      await component['onSubmit']();

      expect(component['errorMessage']()).toBe('Server error');
    });

    it('should show default error message when no specific error is provided', async () => {
      component['loginForm'].patchValue({
        email: 'test@example.com',
        password: 'WrongPassword',
      });

      mockAuthService.login.mockReturnValue(throwError(() => ({})));

      await component['onSubmit']();

      expect(component['errorMessage']()).toBe('Login failed. Please check your credentials.');
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
});
