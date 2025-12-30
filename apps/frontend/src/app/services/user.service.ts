import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment.development';

export interface UserProfile {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface UpdateProfileRequest {
  firstName?: string;
  lastName?: string;
  email?: string;
  password?: string;
}

@Injectable({
  providedIn: 'root',
})
export class UserService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/api/user`;

  /**
   * Get the current user's profile
   */
  async getProfile(): Promise<UserProfile> {
    return firstValueFrom(this.http.get<UserProfile>(`${this.apiUrl}/profile`));
  }

  /**
   * Update the current user's profile
   */
  async updateProfile(data: UpdateProfileRequest): Promise<UserProfile> {
    return firstValueFrom(this.http.put<UserProfile>(`${this.apiUrl}/profile`, data));
  }
}
