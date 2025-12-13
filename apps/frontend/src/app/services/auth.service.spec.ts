import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Router } from '@angular/router';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  let service: AuthService;
  let httpMock: HttpTestingController;
  let mockRouter: { navigate: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    // Clear storage FIRST before creating service
    localStorage.clear();
    sessionStorage.clear();

    // Create router mock
    mockRouter = {
      navigate: vi.fn(),
    };

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: Router, useValue: mockRouter },
        AuthService,
      ],
    });

    service = TestBed.inject(AuthService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('register', () => {
    it('should call registration endpoint with correct data', () => {
      const mockResponse = {
        message: 'User registered successfully',
        user: {
          id: '123',
          email: 'test@example.com',
        },
        accessToken: 'mock-access-token',
        refreshToken: 'mock-refresh-token',
      };

      service.register('test@example.com', 'Test1234').subscribe({
        next: (response) => {
          expect(response).toEqual(mockResponse);
        },
      });

      const req = httpMock.expectOne(`/api/auth/register`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({
        email: 'test@example.com',
        password: 'Test1234',
      });

      req.flush(mockResponse);
      httpMock.verify();
    });

    it('should handle registration errors', () => {
      const mockError = {
        error: 'Email already registered',
      };

      service.register('duplicate@example.com', 'Test1234').subscribe({
        next: () => {
          throw new Error('Should have failed');
        },
        error: (error) => {
          expect(error.error.error).toBe('Email already registered');
        },
      });

      const req = httpMock.expectOne(`/api/auth/register`);
      req.flush(mockError, { status: 409, statusText: 'Conflict' });
      httpMock.verify();
    });
  });

  describe('login', () => {
    const mockLoginResponse = {
      message: 'Login successful',
      user: {
        id: '123',
        email: 'test@example.com',
      },
      accessToken: 'mock-access-token',
      refreshToken: 'mock-refresh-token',
    };

    it('should store tokens in sessionStorage when rememberMe is false', () => {
      service.login('test@example.com', 'Test1234', false).subscribe({
        next: () => {
          // Check sessionStorage
          expect(sessionStorage.getItem('accessToken')).toBe('mock-access-token');
          expect(sessionStorage.getItem('refreshToken')).toBe('mock-refresh-token');

          // Ensure localStorage is empty
          expect(localStorage.getItem('accessToken')).toBeNull();
          expect(localStorage.getItem('refreshToken')).toBeNull();
        },
      });

      const req = httpMock.expectOne(`/api/auth/login`);
      expect(req.request.method).toBe('POST');
      req.flush(mockLoginResponse);
      httpMock.verify();
    });

    it('should store tokens in localStorage when rememberMe is true', () => {
      service.login('test@example.com', 'Test1234', true).subscribe({
        next: () => {
          // Check localStorage
          expect(localStorage.getItem('accessToken')).toBe('mock-access-token');
          expect(localStorage.getItem('refreshToken')).toBe('mock-refresh-token');

          // Ensure sessionStorage is empty
          expect(sessionStorage.getItem('accessToken')).toBeNull();
          expect(sessionStorage.getItem('refreshToken')).toBeNull();
        },
      });

      const req = httpMock.expectOne(`/api/auth/login`);
      req.flush(mockLoginResponse);
      httpMock.verify();
    });

    it('should update currentUser signal on successful login', () => {
      service.login('test@example.com', 'Test1234', false).subscribe({
        next: () => {
          expect(service.currentUser()).toEqual({
            id: '123',
            email: 'test@example.com',
          });
        },
      });

      const req = httpMock.expectOne(`/api/auth/login`);
      req.flush(mockLoginResponse);
      httpMock.verify();
    });

    it('should update isAuthenticated signal on successful login', () => {
      expect(service.isAuthenticated()).toBe(false);

      service.login('test@example.com', 'Test1234', false).subscribe({
        next: () => {
          expect(service.isAuthenticated()).toBe(true);
        },
      });

      const req = httpMock.expectOne(`/api/auth/login`);
      req.flush(mockLoginResponse);
      httpMock.verify();
    });

    it('should clear other storage when rememberMe changes', () => {
      // First, set some tokens in localStorage
      localStorage.setItem('accessToken', 'old-token');
      localStorage.setItem('refreshToken', 'old-refresh');

      // Login with rememberMe=false (should use sessionStorage and clear localStorage)
      service.login('test@example.com', 'Test1234', false).subscribe({
        next: () => {
          expect(localStorage.getItem('accessToken')).toBeNull();
          expect(localStorage.getItem('refreshToken')).toBeNull();
          expect(sessionStorage.getItem('accessToken')).toBe('mock-access-token');
        },
      });

      const req = httpMock.expectOne(`/api/auth/login`);
      req.flush(mockLoginResponse);
      httpMock.verify();
    });

    it('should handle login errors', () => {
      const mockError = {
        error: 'Invalid email or password',
      };

      service.login('test@example.com', 'WrongPassword', false).subscribe({
        next: () => {
          throw new Error('Should have failed');
        },
        error: (error) => {
          expect(error.error.error).toBe('Invalid email or password');
        },
      });

      const req = httpMock.expectOne(`/api/auth/login`);
      req.flush(mockError, { status: 401, statusText: 'Unauthorized' });
      httpMock.verify();
    });
  });

  describe('logout', () => {
    it('should clear tokens from both storages', () => {
      // Set tokens in both storages
      localStorage.setItem('accessToken', 'token');
      localStorage.setItem('refreshToken', 'refresh');
      sessionStorage.setItem('accessToken', 'token');
      sessionStorage.setItem('refreshToken', 'refresh');
      service.currentUser.set({ id: '123', email: 'test@example.com' });
      service.isAuthenticated.set(true);

      service.logout();

      expect(localStorage.getItem('accessToken')).toBeNull();
      expect(localStorage.getItem('refreshToken')).toBeNull();
      expect(sessionStorage.getItem('accessToken')).toBeNull();
      expect(sessionStorage.getItem('refreshToken')).toBeNull();
    });

    it('should reset currentUser signal', () => {
      service.currentUser.set({ id: '123', email: 'test@example.com' });

      service.logout();

      expect(service.currentUser()).toBeNull();
    });

    it('should reset isAuthenticated signal', () => {
      service.isAuthenticated.set(true);

      service.logout();

      expect(service.isAuthenticated()).toBe(false);
    });

    it('should navigate to login page', () => {
      service.logout();

      expect(mockRouter.navigate).toHaveBeenCalledWith(['/login']);
    });
  });

  describe('getAccessToken', () => {
    it('should return token from localStorage if present', () => {
      localStorage.setItem('accessToken', 'local-token');

      expect(service.getAccessToken()).toBe('local-token');
    });

    it('should return token from sessionStorage if localStorage is empty', () => {
      sessionStorage.setItem('accessToken', 'session-token');

      expect(service.getAccessToken()).toBe('session-token');
    });

    it('should return null if no token exists', () => {
      expect(service.getAccessToken()).toBeNull();
    });

    it('should prioritize localStorage over sessionStorage', () => {
      localStorage.setItem('accessToken', 'local-token');
      sessionStorage.setItem('accessToken', 'session-token');

      expect(service.getAccessToken()).toBe('local-token');
    });
  });

  describe('getRefreshToken', () => {
    it('should return token from localStorage if present', () => {
      localStorage.setItem('refreshToken', 'local-refresh');

      expect(service.getRefreshToken()).toBe('local-refresh');
    });

    it('should return token from sessionStorage if localStorage is empty', () => {
      sessionStorage.setItem('refreshToken', 'session-refresh');

      expect(service.getRefreshToken()).toBe('session-refresh');
    });

    it('should return null if no token exists', () => {
      expect(service.getRefreshToken()).toBeNull();
    });
  });

  describe('initialization', () => {
    it('should check for existing tokens on initialization', () => {
      // Clear everything first
      localStorage.clear();
      sessionStorage.clear();

      // Store a token before creating service
      localStorage.setItem('accessToken', 'existing-token');

      // Create new service instance (simulates app startup)
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        providers: [
          AuthService,
          provideHttpClient(),
          provideHttpClientTesting(),
          { provide: Router, useValue: mockRouter },
        ],
      });
      const newService = TestBed.inject(AuthService);

      expect(newService.isAuthenticated()).toBe(true);

      // Clean up
      localStorage.clear();
      sessionStorage.clear();
    });

    it('should not set isAuthenticated if no tokens exist', () => {
      // Clear everything first
      localStorage.clear();
      sessionStorage.clear();

      // Create new service with no stored tokens
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        providers: [
          AuthService,
          provideHttpClient(),
          provideHttpClientTesting(),
          { provide: Router, useValue: mockRouter },
        ],
      });
      const newService = TestBed.inject(AuthService);

      expect(newService.isAuthenticated()).toBe(false);

      // Clean up
      localStorage.clear();
      sessionStorage.clear();
    });
  });
});
