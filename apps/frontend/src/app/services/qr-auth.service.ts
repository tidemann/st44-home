import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface QrTokenResponse {
  token: string;
  expiresAt: string;
  childId: string;
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  userId: string;
  email: string;
  role?: 'admin' | 'parent' | 'child';
  householdId?: string;
  firstName?: string | null;
  lastName?: string | null;
}

@Injectable({
  providedIn: 'root',
})
export class QrAuthService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/api/qr-auth`;

  /**
   * Generate a new QR token for a child
   * @param childId - The child ID to generate token for
   * @returns Observable with QR token response
   */
  generateQrToken(childId: string): Observable<QrTokenResponse> {
    return this.http.post<QrTokenResponse>(`${this.apiUrl}/generate`, { childId });
  }

  /**
   * Regenerate an existing QR token for a child
   * @param childId - The child ID to regenerate token for
   * @returns Observable with QR token response
   */
  regenerateQrToken(childId: string): Observable<QrTokenResponse> {
    return this.http.post<QrTokenResponse>(`${this.apiUrl}/regenerate`, { childId });
  }

  /**
   * Get the current QR token for a child
   * @param childId - The child ID to get token for
   * @returns Observable with QR token response
   */
  getQrToken(childId: string): Observable<QrTokenResponse> {
    return this.http.get<QrTokenResponse>(`${this.apiUrl}/token/${childId}`);
  }

  /**
   * Login using a QR token
   * @param token - The QR token scanned from the QR code
   * @returns Observable with login response
   */
  loginWithQrToken(token: string): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${this.apiUrl}/login`, { token });
  }
}
