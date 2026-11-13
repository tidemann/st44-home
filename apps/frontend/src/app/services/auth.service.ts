import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, finalize, map, shareReplay, tap, throwError } from 'rxjs';
import { environment } from '../../environments/environment';
import { TokenService } from './token.service';
import { PwaService } from './pwa.service';
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
  invitationAccepted?: boolean;
}

/** Only explicit household invitation return URLs are passed to Google sign-in. */
export function invitationTokenFromReturnUrl(returnUrl: string | undefined): string | undefined {
  // ST-2227: a child link (/invitasjon/:token) is sent too, so a Google login without a
  // Diddit account is refused (NO_ACCOUNT) instead of making a new account and household
  return /^\/(?:invitations\/accept|invitasjon)\/([a-f0-9]{64})$/.exec(returnUrl ?? '')?.[1];
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
  private readonly pwa = inject(PwaService);
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
      // Decode JWT to get user info including role. ST-2539: an expired access token still
      // counts while the refresh token is valid; the first API call refreshes it.
      const decoded =
        this.tokenService.decodeToken(accessToken) ??
        (this.tokenService.hasValidRefreshToken()
          ? this.tokenService.decodeToken(accessToken, true)
          : null);
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

  /** The refresh in flight, shared by every request that got a 401 meanwhile */
  private refreshInFlight: Observable<string> | null = null;

  /**
   * ST-2539: trade the refresh token for a new access token (and a new refresh token).
   * Parallel callers share one request. Emits the new access token.
   */
  refreshSession(): Observable<string> {
    if (this.refreshInFlight) return this.refreshInFlight;

    const refreshToken = this.tokenService.getRefreshToken();
    if (!refreshToken) {
      return throwError(
        () => new HttpErrorResponse({ status: 401, statusText: 'No refresh token' }),
      );
    }
    const strategy = this.tokenService.getStorageStrategy();

    this.refreshInFlight = this.http
      .post<{ accessToken: string; refreshToken?: string }>(`${this.apiUrl}/refresh`, {
        refreshToken,
      })
      .pipe(
        tap((response) => {
          this.tokenService.storeTokens(
            response.accessToken,
            response.refreshToken ?? refreshToken,
            strategy,
          );
          const decoded = this.tokenService.decodeToken(response.accessToken);
          if (decoded) {
            this.currentUser.set({
              id: decoded.userId,
              email: decoded.email,
              role: decoded.role,
              firstName: decoded.firstName,
              lastName: decoded.lastName,
            });
          }
        }),
        map((response) => response.accessToken),
        finalize(() => (this.refreshInFlight = null)),
        shareReplay(1),
      );
    return this.refreshInFlight;
  }

  register(
    email: string,
    password: string,
    firstName: string,
    lastName: string,
    invitationToken?: string,
  ): Observable<AuthResponse> {
    // ST-2348: the token joins the inviting household here, so no empty own household is left behind
    return this.http.post<AuthResponse>(`${this.apiUrl}/register`, {
      email,
      password,
      firstName,
      lastName,
      ...(invitationToken ? { invitationToken } : {}),
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

  loginWithGoogle(credential: string, invitationToken?: string): Observable<AuthResponse> {
    return this.http
      .post<AuthResponse>(`${this.apiUrl}/google`, {
        credential,
        ...(invitationToken ? { invitationToken } : {}),
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

  /** ST-2227: `returnUrl` brings the person back after signing in again («Bytt Google-konto») */
  logout(returnUrl?: string): void {
    // Clear tokens using TokenService
    this.tokenService.clearTokens();

    // Drop API answers the service worker kept for offline use
    void this.pwa.clearApiCache();

    // No reminders for a user who logged out of this phone
    void this.pwa.forgetPushSubscription();

    // Reset household store (clears all cached data)
    this.householdStore.reset();

    // Clear state
    this.currentUser.set(null);
    this.isAuthenticated.set(false);

    // Navigate to login
    if (returnUrl) {
      this.router.navigate(['/login'], { queryParams: { returnUrl } });
    } else {
      this.router.navigate(['/login']);
    }
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
    return this.activeRole();
  }

  /**
   * ST-2227: the role in the active household. One account can be child in one household and
   * admin in another, so the login role (one household picked at sign-in) only stands in
   * until the households are known. The server checks the role per household anyway.
   */
  readonly activeRole = computed<'admin' | 'parent' | 'child' | undefined>(() => {
    if (!this.currentUser()) return undefined;
    return this.householdStore.activeHousehold()?.role ?? this.currentUser()?.role;
  });

  /**
   * Check if the current user has a specific role
   * @param role - The role to check
   * @returns True if the user has the specified role
   */
  hasRole(role: 'admin' | 'parent' | 'child'): boolean {
    return this.activeRole() === role;
  }

  /**
   * Check if the current user has any of the specified roles
   * @param roles - Array of roles to check
   * @returns True if the user has any of the specified roles
   */
  hasAnyRole(roles: ('admin' | 'parent' | 'child')[]): boolean {
    const userRole = this.activeRole();
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
