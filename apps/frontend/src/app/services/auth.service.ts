import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, tap } from 'rxjs';
import { environment } from '../../environments/environment';
import { TokenService } from './token.service';
import { HouseholdStore } from '../stores/household.store';

export interface RegisterRequest {
  email: string;
  password: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  userId: string;
  email: string;
  role?: 'admin' | 'parent' | 'child';
  householdId?: string;
  firstName?: string | null;
  lastName?: string | null;
}

export interface User {
  id: string;
  email: string;
  role?: 'admin' | 'parent' | 'child';
  firstName?: string | null;
  lastName?: string | null;
}

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly tokenService = inject(TokenService);
  private readonly householdStore = inject(HouseholdStore);
  private readonly apiUrl = `${environment.apiUrl}/api/auth`;

  // Signals for reactive state
  currentUser = signal<User | null>(null);
  isAuthenticated = signal(false);

  constructor() {
    // Check for existing tokens on initialization
    this.checkAuthStatus();
  }

  private checkAuthStatus(): void {
    const accessToken = this.tokenService.getAccessToken();
    if (accessToken) {
      // Decode JWT to get user info including role
      const decoded = this.tokenService.decodeToken(accessToken);
      if (decoded) {
        this.currentUser.set({
          id: decoded.userId,
          email: decoded.email,
          role: decoded.role,
          firstName: decoded.firstName,
          lastName: decoded.lastName,
        });
        this.isAuthenticated.set(true);
      }
    }
  }

  register(
    email: string,
    password: string,
    firstName: string,
    lastName: string,
  ): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.apiUrl}/register`, {
      email,
      password,
      firstName,
      lastName,
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
          // Store tokens using TokenService
          this.tokenService.storeTokens(
            response.accessToken,
            response.refreshToken,
            rememberMe ? 'persistent' : 'session',
          );

          // Use response data directly (matches backend LoginResponse)
          this.currentUser.set({
            id: response.userId,
            email: response.email,
            role: response.role,
            firstName: response.firstName,
            lastName: response.lastName,
          });
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
          // Always use persistent storage for OAuth (remember user)
          this.tokenService.storeTokens(response.accessToken, response.refreshToken, 'persistent');

          // Use response data directly (matches backend LoginResponse)
          this.currentUser.set({
            id: response.userId,
            email: response.email,
            role: response.role,
            firstName: response.firstName,
            lastName: response.lastName,
          });
          this.isAuthenticated.set(true);
        }),
      );
  }

  logout(): void {
    // Clear tokens using TokenService
    this.tokenService.clearTokens();

    // Reset household store (clears all cached data)
    this.householdStore.reset();

    // Clear state
    this.currentUser.set(null);
    this.isAuthenticated.set(false);

    // Navigate to login
    this.router.navigate(['/login']);
  }

  getAccessToken(): string | null {
    return this.tokenService.getAccessToken();
  }

  getRefreshToken(): string | null {
    return this.tokenService.getRefreshToken();
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
