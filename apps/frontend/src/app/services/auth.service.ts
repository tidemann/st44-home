import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, tap } from 'rxjs';
import { environment } from '../../environments/environment.development';
import { StorageService } from './storage.service';
import { STORAGE_KEYS } from './storage-keys';

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
  role?: 'admin' | 'parent' | 'child';
}

interface DecodedToken {
  userId: string;
  email: string;
  role?: 'admin' | 'parent' | 'child';
  type: string;
  iat: number;
  exp: number;
}

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly storage = inject(StorageService);
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
      this.storage.getString(STORAGE_KEYS.ACCESS_TOKEN) ||
      sessionStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
    if (accessToken) {
      // Decode JWT to get user info including role
      const user = this.decodeToken(accessToken);
      if (user) {
        this.currentUser.set(user);
        this.isAuthenticated.set(true);
      }
    }
  }

  /**
   * Decode JWT token to extract user information
   * @param token - The JWT access token
   * @returns User object or null if token is invalid
   */
  private decodeToken(token: string): User | null {
    try {
      // JWT tokens have 3 parts separated by dots: header.payload.signature
      const parts = token.split('.');
      if (parts.length !== 3) {
        return null;
      }

      // Decode the payload (second part)
      const payload = parts[1];
      const decodedPayload = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
      const decoded = JSON.parse(decodedPayload) as DecodedToken;

      // Check if token is expired
      const now = Math.floor(Date.now() / 1000);
      if (decoded.exp && decoded.exp < now) {
        return null;
      }

      return {
        id: decoded.userId,
        email: decoded.email,
        role: decoded.role,
      };
    } catch (error) {
      console.error('Failed to decode token:', error);
      return null;
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
          if (rememberMe) {
            this.storage.set(STORAGE_KEYS.ACCESS_TOKEN, response.accessToken);
            this.storage.set(STORAGE_KEYS.REFRESH_TOKEN, response.refreshToken);
            sessionStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN);
            sessionStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN);
          } else {
            sessionStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, response.accessToken);
            sessionStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, response.refreshToken);
            this.storage.remove(STORAGE_KEYS.ACCESS_TOKEN);
            this.storage.remove(STORAGE_KEYS.REFRESH_TOKEN);
          }

          // Decode token to get user info with role
          const user = this.decodeToken(response.accessToken);
          if (user) {
            this.currentUser.set(user);
            this.isAuthenticated.set(true);
          }
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
          this.storage.set(STORAGE_KEYS.ACCESS_TOKEN, response.accessToken);
          this.storage.set(STORAGE_KEYS.REFRESH_TOKEN, response.refreshToken);

          // Clear session storage
          sessionStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN);
          sessionStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN);

          // Decode token to get user info with role
          const user = this.decodeToken(response.accessToken);
          if (user) {
            this.currentUser.set(user);
            this.isAuthenticated.set(true);
          }
        }),
      );
  }

  logout(): void {
    // Clear tokens from both storages
    this.storage.remove(STORAGE_KEYS.ACCESS_TOKEN);
    this.storage.remove(STORAGE_KEYS.REFRESH_TOKEN);
    sessionStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN);
    sessionStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN);

    // Clear household context
    this.storage.remove(STORAGE_KEYS.ACTIVE_HOUSEHOLD_ID);

    // Clear state
    this.currentUser.set(null);
    this.isAuthenticated.set(false);

    // Navigate to login
    this.router.navigate(['/login']);
  }

  getAccessToken(): string | null {
    return (
      this.storage.getString(STORAGE_KEYS.ACCESS_TOKEN) ||
      sessionStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN)
    );
  }

  getRefreshToken(): string | null {
    return (
      this.storage.getString(STORAGE_KEYS.REFRESH_TOKEN) ||
      sessionStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN)
    );
  }

  /**
   * Get the current user's ID
   * @returns The user ID or null if not authenticated
   */
  getCurrentUserId(): string | null {
    return this.currentUser()?.id ?? null;
  }

  /**
   * Get the current user's role
   * @returns The role or undefined if not authenticated
   */
  getUserRole(): 'admin' | 'parent' | 'child' | undefined {
    return this.currentUser()?.role;
  }

  /**
   * Check if the current user has a specific role
   * @param role - The role to check
   * @returns True if the user has the specified role
   */
  hasRole(role: 'admin' | 'parent' | 'child'): boolean {
    return this.currentUser()?.role === role;
  }

  /**
   * Check if the current user has any of the specified roles
   * @param roles - Array of roles to check
   * @returns True if the user has any of the specified roles
   */
  hasAnyRole(roles: ('admin' | 'parent' | 'child')[]): boolean {
    const userRole = this.currentUser()?.role;
    return userRole !== undefined && roles.includes(userRole);
  }

  /**
   * Request a password reset email
   * @param email - The email address to send reset link to
   * @returns Observable that completes when email is sent
   */
  forgotPassword(email: string): Observable<void> {
    return this.http.post<void>(`${this.apiUrl}/forgot-password`, { email });
  }

  /**
   * Reset password with token
   * @param token - The reset token from email
   * @param newPassword - The new password
   * @returns Observable that completes when password is reset
   */
  resetPassword(token: string, newPassword: string): Observable<void> {
    return this.http.post<void>(`${this.apiUrl}/reset-password`, { token, newPassword });
  }
}
