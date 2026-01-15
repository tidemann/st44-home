import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RegisterComponent } from './register';
import { AuthService } from '../services/auth.service';
import { Router, provideRouter, ActivatedRoute } from '@angular/router';
import { of, throwError } from 'rxjs';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';

describe('RegisterComponent', () => {
  let component: RegisterComponent;
  let fixture: ComponentFixture<RegisterComponent>;
  let mockAuthService: { register: ReturnType<typeof vi.fn> };
  let mockActivatedRoute: { snapshot: { queryParams: Record<string, string> } };
  let router: Router;

  beforeEach(() => {
    // Clear storage before tests
    localStorage.clear();
    sessionStorage.clear();

    // Create mocks
    mockAuthService = {
      register: vi.fn(),
    };
    mockActivatedRoute = {
      snapshot: { queryParams: {} },
    };

    TestBed.configureTestingModule({
      imports: [RegisterComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: AuthService, useValue: mockAuthService },
        { provide: ActivatedRoute, useValue: mockActivatedRoute },
      ],
    });

    fixture = TestBed.createComponent(RegisterComponent);
    component = fixture.componentInstance;
    router = TestBed.inject(Router);
    vi.spyOn(router, 'navigate');
    fixture.detectChanges();
  });

  describe('Component Initialization', () => {
    it('should create', () => {
      expect(component).toBeTruthy();
    });

    it('should initialize form with empty values', () => {
      expect(component['registerForm'].value).toEqual({
        firstName: '',
        lastName: '',
        email: '',
        password: '',
        confirmPassword: '',
      });
    });

    it('should initialize signals with default values', () => {
      expect(component['showPassword']()).toBe(false);
      expect(component['isLoading']()).toBe(false);
      expect(component['errorMessage']()).toBe(null);
    });
  });

  describe('Form Validation - Email', () => {
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
  });

  describe('Form Validation - Password', () => {
    it('should mark password as invalid when empty', () => {
      const passwordControl = component['passwordControl'];
      passwordControl.markAsTouched();

      expect(passwordControl.invalid).toBe(true);
      expect(passwordControl.hasError('required')).toBe(true);
    });

    it('should mark password as invalid when shorter than 8 characters', () => {
      const passwordControl = component['passwordControl'];
      passwordControl.setValue('Test1');

      expect(passwordControl.invalid).toBe(true);
      expect(passwordControl.hasError('minlength')).toBe(true);
    });

    it('should mark password as invalid when missing uppercase letter', () => {
      const passwordControl = component['passwordControl'];
      passwordControl.setValue('password123');

      expect(passwordControl.invalid).toBe(true);
      expect(passwordControl.hasError('passwordStrength')).toBeTruthy();
    });

    it('should mark password as invalid when missing lowercase letter', () => {
      const passwordControl = component['passwordControl'];
      passwordControl.setValue('PASSWORD123');

      expect(passwordControl.invalid).toBe(true);
      expect(passwordControl.hasError('passwordStrength')).toBeTruthy();
    });

    it('should mark password as invalid when missing number', () => {
      const passwordControl = component['passwordControl'];
      passwordControl.setValue('Password');

      expect(passwordControl.invalid).toBe(true);
      expect(passwordControl.hasError('passwordStrength')).toBeTruthy();
    });

    it('should mark password as valid when meets all requirements', () => {
      const passwordControl = component['passwordControl'];
      passwordControl.setValue('Password123');

      expect(passwordControl.valid).toBe(true);
    });
  });

  describe('Form Validation - Confirm Password', () => {
    it('should mark confirmPassword as invalid when empty', () => {
      const confirmPasswordControl = component['confirmPasswordControl'];
      confirmPasswordControl.markAsTouched();

      expect(confirmPasswordControl.invalid).toBe(true);
      expect(confirmPasswordControl.hasError('required')).toBe(true);
    });

    it('should mark form as invalid when passwords do not match', () => {
      component['registerForm'].patchValue({
        password: 'Password123',
        confirmPassword: 'Different123',
      });

      expect(component['registerForm'].hasError('passwordMismatch')).toBe(true);
    });

    it('should mark form as valid when passwords match', () => {
      component['registerForm'].patchValue({
        firstName: 'Test',
        lastName: 'User',
        email: 'test@example.com',
        password: 'Password123',
        confirmPassword: 'Password123',
      });

      expect(component['registerForm'].hasError('passwordMismatch')).toBe(false);
      expect(component['registerForm'].valid).toBe(true);
    });
  });

  describe('Password Strength Indicator', () => {
    it('should return weak strength for short password without special chars', () => {
      component['passwordControl'].setValue('abc');

      expect(component['passwordStrength']()).toBe('weak');
    });

    it('should return medium strength for password with some requirements', () => {
      component['passwordControl'].setValue('password123');

      expect(component['passwordStrength']()).toBe('medium');
    });

    it('should return strong strength for password meeting all requirements', () => {
      component['passwordControl'].setValue('Password123!');

      expect(component['passwordStrength']()).toBe('strong');
    });

    it('should return weak strength for empty password', () => {
      component['passwordControl'].setValue('');

      expect(component['passwordStrength']()).toBe('weak');
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

      expect(mockAuthService.register).not.toHaveBeenCalled();
      expect(router.navigate).not.toHaveBeenCalled();
    });

    it('should call authService.register with correct parameters', async () => {
      component['registerForm'].patchValue({
        firstName: 'Test',
        lastName: 'User',
        email: 'test@example.com',
        password: 'Test1234',
        confirmPassword: 'Test1234',
      });

      mockAuthService.register.mockReturnValue(of({}));

      await component['onSubmit']();

      expect(mockAuthService.register).toHaveBeenCalledWith(
        'test@example.com',
        'Test1234',
        'Test',
        'User',
      );
    });

    it('should navigate to login with registered=true on successful registration', async () => {
      component['registerForm'].patchValue({
        firstName: 'Test',
        lastName: 'User',
        email: 'test@example.com',
        password: 'Test1234',
        confirmPassword: 'Test1234',
      });

      mockAuthService.register.mockReturnValue(of({}));

      await component['onSubmit']();

      expect(router.navigate).toHaveBeenCalledWith(['/login'], {
        queryParams: { registered: 'true' },
      });
    });

    it('should preserve returnUrl when navigating to login after registration', async () => {
      mockActivatedRoute.snapshot.queryParams = {
        returnUrl: '/invitations/accept/test-token',
      };

      component['registerForm'].patchValue({
        firstName: 'Test',
        lastName: 'User',
        email: 'test@example.com',
        password: 'Test1234',
        confirmPassword: 'Test1234',
      });

      mockAuthService.register.mockReturnValue(of({}));

      await component['onSubmit']();

      expect(router.navigate).toHaveBeenCalledWith(['/login'], {
        queryParams: { registered: 'true', returnUrl: '/invitations/accept/test-token' },
      });
    });

    it('should set isLoading to true during registration', async () => {
      component['registerForm'].patchValue({
        firstName: 'Test',
        lastName: 'User',
        email: 'test@example.com',
        password: 'Test1234',
        confirmPassword: 'Test1234',
      });

      // Mock register to return a promise that doesn't resolve immediately
      let resolveRegister: (value: unknown) => void;
      const registerPromise = new Promise((resolve) => {
        resolveRegister = resolve;
      });
      mockAuthService.register.mockReturnValue({
        toPromise: () => registerPromise,
      });

      const submitPromise = component['onSubmit']();

      // Should be loading
      expect(component['isLoading']()).toBe(true);

      // Resolve registration and wait
      resolveRegister!({});
      await submitPromise;

      // Should no longer be loading
      expect(component['isLoading']()).toBe(false);
    });

    it('should clear errorMessage on new submission', async () => {
      component['errorMessage'].set('Previous error');
      component['registerForm'].patchValue({
        firstName: 'Test',
        lastName: 'User',
        email: 'test@example.com',
        password: 'Test1234',
        confirmPassword: 'Test1234',
      });

      mockAuthService.register.mockReturnValue(of({}));

      await component['onSubmit']();

      expect(component['errorMessage']()).toBe(null);
    });

    it('should handle registration error with error.error property', async () => {
      component['registerForm'].patchValue({
        firstName: 'Test',
        lastName: 'User',
        email: 'existing@example.com',
        password: 'Test1234',
        confirmPassword: 'Test1234',
      });

      mockAuthService.register.mockReturnValue(
        throwError(() => ({
          error: { error: 'Email already exists' },
        })),
      );

      await component['onSubmit']();

      expect(component['errorMessage']()).toBe('Email already exists');
      expect(component['isLoading']()).toBe(false);
      expect(router.navigate).not.toHaveBeenCalled();
    });

    it('should show default error message when no specific error is provided', async () => {
      component['registerForm'].patchValue({
        firstName: 'Test',
        lastName: 'User',
        email: 'test@example.com',
        password: 'Test1234',
        confirmPassword: 'Test1234',
      });

      mockAuthService.register.mockReturnValue(throwError(() => ({})));

      await component['onSubmit']();

      expect(component['errorMessage']()).toBe('Registrering feilet. Vennligst prøv igjen.');
    });
  });
});
