import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface Item {
  id: number;
  title: string;
  description: string | null;
  created_at: string;
  updated_at: string;
}

interface ItemsResponse {
  items: Item[];
}

@Injectable({
  providedIn: 'root',
})
export class ApiService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = 'http://localhost:3000/api';

  getItems(): Observable<ItemsResponse> {
    return this.http.get<ItemsResponse>(`${this.apiUrl}/items`);
  }

  getHealth(): Observable<{ status: string; database: string }> {
    return this.http.get<{ status: string; database: string }>('http://localhost:3000/health');
  }
}
