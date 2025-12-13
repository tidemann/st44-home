import { Component, signal, inject, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ApiService, Item } from './services/api.service';
import { DatePipe } from '@angular/common';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, DatePipe],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App implements OnInit {
  private readonly apiService = inject(ApiService);

  protected readonly title = signal('home');
  protected readonly items = signal<Item[]>([]);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly backendStatus = signal<string>('checking...');

  ngOnInit() {
    this.loadBackendStatus();
    this.loadItems();
  }

  private loadBackendStatus() {
    this.apiService.getHealth().subscribe({
      next: (response) => {
        this.backendStatus.set(response.status === 'ok' ? 'connected' : 'disconnected');
      },
      error: () => {
        this.backendStatus.set('disconnected');
      },
    });
  }

  private loadItems() {
    this.apiService.getItems().subscribe({
      next: (response) => {
        this.items.set(response.items);
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set('Failed to load items from backend');
        this.loading.set(false);
        console.error('Error loading items:', err);
      },
    });
  }
}
