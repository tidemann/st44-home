/**
 * API Service
 *
 * Provides HTTP methods for communicating with the backend API.
 * Authentication and error handling are managed by HTTP interceptors.
 *
 * Features:
 * - Promise-based API for backward compatibility
 * - Observable-based methods for RxJS patterns
 * - Automatic base URL handling
 * - Content-Type header for JSON bodies
 *
 * Note: Authorization headers are automatically added by authInterceptor.
 * Error handling is centralized in errorInterceptor.
 */

import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders, HttpContext } from '@angular/common/http';
import { Observable, firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';
import { SKIP_LOADING } from '../interceptors/loading.interceptor';

/**
 * Options for API requests
 */
export interface ApiRequestOptions {
  /** Skip loading indicator for this request */
  skipLoading?: boolean;
}

@Injectable({
  providedIn: 'root',
})
export class ApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/api`;

  /**
   * Build request headers
   */
  private getHeaders(includeContentType = true): HttpHeaders {
    let headers = new HttpHeaders();
    if (includeContentType) {
      headers = headers.set('Content-Type', 'application/json');
    }
    return headers;
  }

  /**
   * Build HTTP context from options
   */
  private getContext(options?: ApiRequestOptions): HttpContext {
    let context = new HttpContext();
    if (options?.skipLoading) {
      context = context.set(SKIP_LOADING, true);
    }
    return context;
  }

  // =====================================================
  // Promise-based methods (backward compatible)
  // =====================================================

  /**
   * GET request (Promise)
   */
  async get<T>(endpoint: string, options?: ApiRequestOptions): Promise<T> {
    return firstValueFrom(this.get$<T>(endpoint, options));
  }

  /**
   * POST request (Promise)
   */
  async post<T>(endpoint: string, body: unknown, options?: ApiRequestOptions): Promise<T> {
    return firstValueFrom(this.post$<T>(endpoint, body, options));
  }

  /**
   * PUT request (Promise)
   */
  async put<T>(endpoint: string, body: unknown, options?: ApiRequestOptions): Promise<T> {
    return firstValueFrom(this.put$<T>(endpoint, body, options));
  }

  /**
   * DELETE request (Promise)
   */
  async delete<T>(endpoint: string, options?: ApiRequestOptions): Promise<T> {
    return firstValueFrom(this.delete$<T>(endpoint, options));
  }

  // =====================================================
  // Observable-based methods (RxJS patterns)
  // =====================================================

  /**
   * GET request (Observable)
   * @returns Observable that emits the response
   */
  get$<T>(endpoint: string, options?: ApiRequestOptions): Observable<T> {
    const url = `${this.baseUrl}${endpoint}`;
    return this.http.get<T>(url, {
      headers: this.getHeaders(),
      context: this.getContext(options),
    });
  }

  /**
   * POST request (Observable)
   * @returns Observable that emits the response
   */
  post$<T>(endpoint: string, body: unknown, options?: ApiRequestOptions): Observable<T> {
    const url = `${this.baseUrl}${endpoint}`;
    return this.http.post<T>(url, body, {
      headers: this.getHeaders(),
      context: this.getContext(options),
    });
  }

  /**
   * PUT request (Observable)
   * @returns Observable that emits the response
   */
  put$<T>(endpoint: string, body: unknown, options?: ApiRequestOptions): Observable<T> {
    const url = `${this.baseUrl}${endpoint}`;
    return this.http.put<T>(url, body, {
      headers: this.getHeaders(),
      context: this.getContext(options),
    });
  }

  /**
   * PATCH request (Observable)
   * @returns Observable that emits the response
   */
  patch$<T>(endpoint: string, body: unknown, options?: ApiRequestOptions): Observable<T> {
    const url = `${this.baseUrl}${endpoint}`;
    return this.http.patch<T>(url, body, {
      headers: this.getHeaders(),
      context: this.getContext(options),
    });
  }

  /**
   * DELETE request (Observable)
   * @returns Observable that emits the response
   */
  delete$<T>(endpoint: string, options?: ApiRequestOptions): Observable<T> {
    const url = `${this.baseUrl}${endpoint}`;
    return this.http.delete<T>(url, {
      headers: this.getHeaders(false),
      context: this.getContext(options),
    });
  }
}
