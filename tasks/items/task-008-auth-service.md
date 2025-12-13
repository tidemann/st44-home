# Task: Create Auth Service

## Metadata
- **ID**: task-008
- **Feature**: feature-001 - User Authentication System
- **Epic**: epic-001 - Multi-Tenant Foundation
- **Status**: pending
- **Priority**: critical
- **Created**: 2025-12-13
- **Assigned Agent**: frontend
- **Estimated Duration**: 4-5 hours

## Description
Create an Angular service that manages authentication state, handles API calls for registration/login/logout, stores and retrieves JWT tokens, and provides observables for authentication status. This service is the central authentication authority for the frontend application.

## Requirements
- Injectable service with providedIn: 'root'
- Methods: register(), login(), logout(), refresh Token()
- Token storage (localStorage or sessionStorage)
- Current user state (signal)
- Authentication status observable/signal
- HTTP interceptor to add tokens to requests (or separate service)
- Token expiry handling
- Automatic token refresh logic

## Acceptance Criteria
- [ ] Service created and injectable
- [ ] register(email, password) calls API and returns result
- [ ] login(email, password, rememberMe) calls API, stores tokens, updates state
- [ ] logout() clears tokens and resets state
- [ ] refreshToken() calls API and updates access token
- [ ] getAccessToken() retrieves current valid token
- [ ] isAuthenticated() returns current auth status
- [ ] currentUser signal provides user info
- [ ] Tokens stored in correct storage (localStorage vs sessionStorage)
- [ ] Service handles HTTP errors properly
- [ ] All tests passing

## Dependencies
- task-002: Registration API endpoint
- task-003: Login API endpoint
- task-004: Token refresh endpoint
- Angular HttpClient configured

## Technical Notes

### Token Storage Structure
```typescript
interface TokenStorage {
  accessToken: string;
  refreshToken: string;
  userId: string;
  email: string;
}
```

### Token Expiry
- Access tokens expire in 1 hour
- Refresh tokens expire in 7 days
- Implement auto-refresh when access token is near expiry
- Use HTTP interceptor to detect 401 and attempt refresh

### State Management
Use signals for reactive state:
```typescript
currentUser = signal<User | null>(null);
isAuthenticated = computed(() => this.currentUser() !== null);
```

## Affected Areas
- [x] Frontend (Angular)

## Implementation Plan

### Research Phase
- [x] Review Angular service patterns
- [x] Review HttpClient usage
- [x] Review token refresh strategies

### Implementation Steps
1. Create service: `ng generate service services/auth`
2. Inject HttpClient
3. Implement register() method
4. Implement login() method with token storage
5. Implement logout() method
6. Implement refreshToken() method
7. Implement getAccessToken() with expiry check
8. Create currentUser signal
9. Implement initialization (check for existing tokens)
10. Add error handling
11. Create AuthInterceptor (optional, can be separate task)
12. Add service tests

### Testing Strategy
- Unit test: register() calls correct endpoint
- Unit test: login() stores tokens correctly
- Unit test: logout() clears tokens
- Unit test: getAccessToken() refreshes when needed
- Unit test: Token storage respects rememberMe
- Integration test: Full auth flow

## Code Structure

```typescript
// apps/frontend/src/app/services/auth.service.ts

import { Injectable, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';

interface User {
  userId: string;
  email: string;
}

interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  userId: string;
  email: string;
}

interface RegisterResponse {
  userId: string;
  email: string;
}

interface RefreshResponse {
  accessToken: string;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private http = inject(HttpClient);
  private router = inject(Router);
  
  private readonly API_URL = environment.apiUrl;
  private readonly STORAGE_KEY = 'auth_tokens';
  
  // State
  currentUser = signal<User | null>(null);
  isAuthenticated = computed(() => this.currentUser() !== null);
  
  private storageType: Storage = localStorage;

  constructor() {
    this.initializeAuth();
  }

  /**
   * Initialize authentication state from stored tokens
   */
  private initializeAuth() {
    // Check both storage types
    const localTokens = localStorage.getItem(this.STORAGE_KEY);
    const sessionTokens = sessionStorage.getItem(this.STORAGE_KEY);
    
    const tokens = localTokens || sessionTokens;
    
    if (tokens) {
      try {
        const parsed = JSON.parse(tokens);
        this.storageType = localTokens ? localStorage : sessionStorage;
        
        // Verify token is still valid
        if (this.isTokenValid(parsed.accessToken)) {
          this.currentUser.set({
            userId: parsed.userId,
            email: parsed.email
          });
        } else {
          // Try to refresh
          this.refreshToken().catch(() => this.logout());
        }
      } catch {
        this.clearTokens();
      }
    }
  }

  /**
   * Register a new user
   */
  async register(email: string, password: string): Promise<RegisterResponse> {
    try {
      const response = await firstValueFrom(
        this.http.post<RegisterResponse>(`${this.API_URL}/auth/register`, {
          email,
          password
        })
      );
      return response;
    } catch (error) {
      console.error('Registration error:', error);
      throw error;
    }
  }

  /**
   * Login user and store tokens
   */
  async login(email: string, password: string, rememberMe: boolean = false): Promise<void> {
    try {
      const response = await firstValueFrom(
        this.http.post<LoginResponse>(`${this.API_URL}/auth/login`, {
          email,
          password
        })
      );
      
      // Store tokens
      this.storageType = rememberMe ? localStorage : sessionStorage;
      this.storeTokens(response);
      
      // Update state
      this.currentUser.set({
        userId: response.userId,
        email: response.email
      });
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  }

  /**
   * Logout user and clear tokens
   */
  async logout(): Promise<void> {
    try {
      const token = this.getStoredAccessToken();
      if (token) {
        // Call logout endpoint
        await firstValueFrom(
          this.http.post(`${this.API_URL}/auth/logout`, {}, {
            headers: { Authorization: `Bearer ${token}` }
          })
        ).catch(() => {}); // Ignore errors
      }
    } finally {
      this.clearTokens();
      this.currentUser.set(null);
      this.router.navigate(['/login']);
    }
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshToken(): Promise<void> {
    const tokens = this.getStoredTokens();
    if (!tokens?.refreshToken) {
      throw new Error('No refresh token available');
    }
    
    try {
      const response = await firstValueFrom(
        this.http.post<RefreshResponse>(`${this.API_URL}/auth/refresh`, {
          refreshToken: tokens.refreshToken
        })
      );
      
      // Update access token
      const updatedTokens = {
        ...tokens,
        accessToken: response.accessToken
      };
      this.storageType.setItem(this.STORAGE_KEY, JSON.stringify(updatedTokens));
    } catch (error) {
      console.error('Token refresh error:', error);
      this.logout();
      throw error;
    }
  }

  /**
   * Get current access token (refreshes if needed)
   */
  async getAccessToken(): Promise<string | null> {
    const tokens = this.getStoredTokens();
    if (!tokens) return null;
    
    // Check if token is still valid
    if (this.isTokenValid(tokens.accessToken)) {
      return tokens.accessToken;
    }
    
    // Try to refresh
    try {
      await this.refreshToken();
      const refreshedTokens = this.getStoredTokens();
      return refreshedTokens?.accessToken || null;
    } catch {
      return null;
    }
  }

  /**
   * Store tokens in appropriate storage
   */
  private storeTokens(response: LoginResponse) {
    const tokens = {
      accessToken: response.accessToken,
      refreshToken: response.refreshToken,
      userId: response.userId,
      email: response.email
    };
    this.storageType.setItem(this.STORAGE_KEY, JSON.stringify(tokens));
  }

  /**
   * Get stored tokens
   */
  private getStoredTokens(): any {
    const tokens = this.storageType.getItem(this.STORAGE_KEY);
    return tokens ? JSON.parse(tokens) : null;
  }

  /**
   * Get stored access token
   */
  private getStoredAccessToken(): string | null {
    const tokens = this.getStoredTokens();
    return tokens?.accessToken || null;
  }

  /**
   * Clear all tokens
   */
  private clearTokens() {
    localStorage.removeItem(this.STORAGE_KEY);
    sessionStorage.removeItem(this.STORAGE_KEY);
  }

  /**
   * Check if token is valid (not expired)
   */
  private isTokenValid(token: string): boolean {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const expiry = payload.exp * 1000; // Convert to milliseconds
      return Date.now() < expiry;
    } catch {
      return false;
    }
  }
}
```

## Progress Log
- [2025-12-13 21:45] Task created from feature-001 breakdown

## Related Files
- `apps/frontend/src/app/services/auth.service.ts` - Main service file
- `apps/frontend/src/app/auth/login.component.ts` - Uses this service
- `apps/frontend/src/app/auth/register.component.ts` - Uses this service

## Future Enhancements
- [ ] Create AuthInterceptor to automatically add tokens to requests
- [ ] Create AuthGuard to protect routes
- [ ] Add token refresh before expiry (proactive refresh)
- [ ] Add retry logic for failed requests due to expired tokens

## Lessons Learned
[To be filled after completion]
