import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import type { CreateManualAssignmentRequest } from '@st44/types/schemas';

export interface GenerateAssignmentsRequest {
  date?: string; // YYYY-MM-DD, defaults to today
  taskId?: string; // Optional, if omitted generates for all active tasks
}

export interface GeneratedAssignment {
  id: string;
  taskId: string;
  childId: string | null;
  date: string;
  status: string;
}

export interface GenerateAssignmentsResponse {
  generated: number;
  assignments: GeneratedAssignment[];
}

export interface ManualAssignmentResponse {
  assignment: {
    id: string;
    taskId: string;
    childId: string | null;
    date: string;
    status: string;
    createdAt: string;
  };
}

@Injectable({
  providedIn: 'root',
})
export class AssignmentService {
  private readonly http = inject(HttpClient);

  /**
   * Generate task assignments for a household
   * @param householdId - The household ID
   * @param request - Optional date and taskId filters
   * @returns Promise with generated assignments count and list
   */
  async generateAssignments(
    householdId: string,
    request?: GenerateAssignmentsRequest,
  ): Promise<GenerateAssignmentsResponse> {
    return firstValueFrom(
      this.http.post<GenerateAssignmentsResponse>(
        `/api/households/${householdId}/assignments/generate`,
        request || {},
      ),
    );
  }

  /**
   * Manually create a task assignment
   * @param request - Manual assignment details (taskId, childId, date)
   * @returns Promise with created assignment
   */
  async createManualAssignment(
    request: CreateManualAssignmentRequest,
  ): Promise<ManualAssignmentResponse> {
    return firstValueFrom(
      this.http.post<ManualAssignmentResponse>(`/api/assignments/manual`, request),
    );
  }
}
