import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, tap } from 'rxjs';
import { environment } from '../../environments/environment.development';

export interface RegisterRequest {
  email: string;
  password: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface AuthResponse {
  message: string;
  user: {
    id: string;
    email: string;
  };
  accessToken: string;
  refreshToken: string;
}

export interface User {
  id: string;
  email: string;
}

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly apiUrl = `${environment.apiUrl}/api/auth`;

  // Signals for reactive state
  currentUser = signal<User | null>(null);
  isAuthenticated = signal(false);

  constructor() {
    // Check for existing tokens on initialization
    this.checkAuthStatus();
  }

  private checkAuthStatus(): void {
    const accessToken =
      localStorage.getItem('accessToken') || sessionStorage.getItem('accessToken');
    if (accessToken) {
      // TODO: Validate token with backend or decode JWT to get user info
      // For now, just mark as authenticated
      this.isAuthenticated.set(true);
    }
  }

  register(email: string, password: string): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.apiUrl}/register`, {
      email,
      password,
    });
  }

  login(email: string, password: string, rememberMe = false): Observable<AuthResponse> {
    return this.http
      .post<AuthResponse>(`${this.apiUrl}/login`, {
        email,
        password,
      })
      .pipe(
        tap((response) => {
          // Store tokens based on rememberMe preference
          const storage = rememberMe ? localStorage : sessionStorage;
          storage.setItem('accessToken', response.accessToken);
          storage.setItem('refreshToken', response.refreshToken);

          // Clear tokens from other storage
          const otherStorage = rememberMe ? sessionStorage : localStorage;
          otherStorage.removeItem('accessToken');
          otherStorage.removeItem('refreshToken');

          // Update state
          this.currentUser.set(response.user);
          this.isAuthenticated.set(true);
        }),
      );
  }

  loginWithGoogle(credential: string): Observable<AuthResponse> {
    return this.http
      .post<AuthResponse>(`${this.apiUrl}/google`, {
        credential,
      })
      .pipe(
        tap((response) => {
          // Always use localStorage for OAuth (remember user)
          localStorage.setItem('accessToken', response.accessToken);
          localStorage.setItem('refreshToken', response.refreshToken);

          // Clear session storage
          sessionStorage.removeItem('accessToken');
          sessionStorage.removeItem('refreshToken');

          // Update state
          this.currentUser.set(response.user);
          this.isAuthenticated.set(true);
        }),
      );
  }

  logout(): void {
    // Clear tokens from both storages
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    sessionStorage.removeItem('accessToken');
    sessionStorage.removeItem('refreshToken');

    // Clear state
    this.currentUser.set(null);
    this.isAuthenticated.set(false);

    // Navigate to login
    this.router.navigate(['/login']);
  }

  getAccessToken(): string | null {
    return localStorage.getItem('accessToken') || sessionStorage.getItem('accessToken');
  }

  getRefreshToken(): string | null {
    return localStorage.getItem('refreshToken') || sessionStorage.getItem('refreshToken');
  }
}
