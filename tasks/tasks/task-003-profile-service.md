# Task: Create Profile Service

## Metadata
- **ID**: task-003
- **Feature**: feature-001 - User Profile Management
- **Epic**: None
- **Status**: pending
- **Priority**: high
- **Created**: 2025-12-13
- **Assigned Agent**: frontend
- **Estimated Duration**: 2 hours

## Description
Create an Angular service to handle profile-related API calls. Follow existing ApiService patterns with proper TypeScript interfaces, RxJS observables, and environment-based URLs.

## Requirements
1. Create ProfileService with inject() pattern
2. Define TypeScript interfaces for profile data
3. Implement getProfile(id) method
4. Implement updateProfile(id, data) method
5. Use environment-based API URLs
6. Return typed observables

## Acceptance Criteria
- [ ] ProfileService created in services directory
- [ ] Uses inject(HttpClient) pattern
- [ ] getProfile(id) returns Observable<UserProfile>
- [ ] updateProfile(id, data) returns Observable<UpdateProfileResponse>
- [ ] TypeScript interfaces match backend API
- [ ] Uses environment.apiUrl for base URL
- [ ] Injectable with providedIn: 'root'
- [ ] Follows existing ApiService patterns
- [ ] Documented in apps/frontend/AGENT.md

## Dependencies
- Task-002 must be completed (API endpoints exist)

## Technical Notes

### Service Implementation
```typescript
// File: apps/frontend/src/app/services/profile.service.ts
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment.development';

export interface UserProfile {
  id: number;
  username: string;
  email: string;
  name: string | null;
  bio: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface UpdateProfileData {
  name: string;
  bio?: string;
}

export interface UpdateProfileResponse {
  success: boolean;
  profile: UserProfile;
}

@Injectable({
  providedIn: 'root',
})
export class ProfileService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/api`;

  getProfile(userId: number): Observable<UserProfile> {
    return this.http.get<UserProfile>(`${this.apiUrl}/users/${userId}/profile`);
  }

  updateProfile(userId: number, data: UpdateProfileData): Observable<UpdateProfileResponse> {
    return this.http.put<UpdateProfileResponse>(`${this.apiUrl}/users/${userId}/profile`, data);
  }
}
```

### Files to Create
- `apps/frontend/src/app/services/profile.service.ts` - New service file

### Files to Update
- `apps/frontend/AGENT.md` - Document profile service pattern

### Testing Approach
Service can be tested with:
- Unit tests using HttpClientTestingModule
- Manual testing by importing in a component
- Integration testing with backend running

## Implementation Plan
1. Create profile.service.ts in services directory
2. Define TypeScript interfaces matching backend API
3. Implement getProfile method with proper typing
4. Implement updateProfile method with proper typing
5. Follow existing ApiService patterns (inject, environment.apiUrl)
6. Update apps/frontend/AGENT.md with service documentation

## Progress Log
- [2025-12-13 DRY RUN] Task created by Orchestrator during feature breakdown
