# Frontend - Agent Context

## Overview

Angular 21+ application using standalone components, signals for state management, and modern TypeScript patterns. Communicates with Fastify backend via HTTP APIs. Follows strict accessibility and responsive design requirements.

## Architecture

```
src/
├── index.html          # Entry HTML
├── main.ts             # Bootstrap
├── styles.css          # Global styles
└── app/
    ├── app.ts          # Root component
    ├── app.html        # Root template
    ├── app.css         # Root styles
    ├── app.config.ts   # App configuration
    ├── app.routes.ts   # Route definitions
    └── services/
        └── api.service.ts  # Backend API client
```

## Current Implementation

### Root Component (`app/app.ts`)

**State Management** (signals):

```typescript
protected readonly title = signal('home');
protected readonly items = signal<Item[]>([]);
protected readonly loading = signal(true);
protected readonly error = signal<string | null>(null);
protected readonly backendStatus = signal<string>('checking...');
```

**Lifecycle**:

- `ngOnInit()`: Loads backend status and items
- Uses `inject()` for dependency injection
- No constructor injection

**Patterns Used**:

- Standalone component (implicit `standalone: true`)
- `ChangeDetectionStrategy.OnPush` required (add if not present)
- Signals for reactive state
- Inject function for services

### API Service (`services/api.service.ts`)

**Current Endpoints**:

- `getItems()`: Returns `Observable<ItemsResponse>`
- `getHealth()`: Returns `Observable<{ status: string; database: string }>`

**Configuration**:

- Uses environment-based API URL
- Relative URLs (empty string for dev/prod)
- Dev: Proxied via `proxy.conf.json`
- Prod: Proxied via Nginx

## Angular Conventions

### Component Structure

**Standalone Component Pattern**:

```typescript
import { Component, signal, inject } from '@angular/core';

@Component({
  selector: 'app-component-name',
  imports: [/* dependencies */],
  templateUrl: './component-name.html',
  styleUrl: './component-name.css',
  changeDetection: ChangeDetectionStrategy.OnPush, // Always add this
})
export class ComponentName {
  private readonly service = inject(SomeService);

  protected readonly state = signal<Type>(initialValue);
  protected readonly computed = computed(() => /* derive from state */);

  // Methods...
}
```

**Key Points**:

- No `standalone: true` (implicit in Angular 20+)
- Use `protected` for template-accessible members
- Use `private` for internal members
- Use `readonly` for injected services
- Use `ChangeDetectionStrategy.OnPush`
- Template file: `component-name.html`
- Style file: `component-name.css`

### State Management with Signals

**Creating signals**:

```typescript
const count = signal(0);
const user = signal<User | null>(null);
const items = signal<Item[]>([]);
```

**Updating signals**:

```typescript
// Set entire value
count.set(5);
user.set(newUser);

// Update based on previous
count.update((n) => n + 1);
items.update((list) => [...list, newItem]);
```

**Computed values**:

```typescript
const doubled = computed(() => count() * 2);
const itemCount = computed(() => items().length);
```

**DO NOT use** `mutate()` - use `update()` or `set()` instead.

### Template Syntax

**Control Flow** (native, not `*ngIf`/`*ngFor`):

```html
@if (loading()) {
<p>Loading...</p>
} @else if (error()) {
<p>Error: {{ error() }}</p>
} @else {
<p>Content</p>
} @for (item of items(); track item.id) {
<div>{{ item.title }}</div>
} @switch (status()) { @case ('loading') {
<p>Loading...</p>
} @case ('success') {
<p>Success!</p>
} @default {
<p>Unknown</p>
} }
```

**Signal access in templates**:

```html
<h1>{{ title() }}</h1>
<p>Count: {{ count() }}</p>
```

**Class bindings** (not `ngClass`):

```html
<div [class.active]="isActive()" [class.disabled]="isDisabled()"></div>
```

**Style bindings** (not `ngStyle`):

```html
<div [style.color]="textColor()" [style.font-size.px]="fontSize()"></div>
```

**Event binding**:

```html
<button (click)="handleClick()">Click</button>
```

### Forms

**Reactive Forms** (preferred):

```typescript
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

@Component({
  imports: [ReactiveFormsModule],
  // ...
})
export class MyForm {
  private readonly fb = inject(FormBuilder);

  protected readonly form = this.fb.group({
    name: ['', [Validators.required, Validators.minLength(3)]],
    email: ['', [Validators.required, Validators.email]],
  });

  protected onSubmit() {
    if (this.form.valid) {
      const data = this.form.value;
      // Submit
    }
  }
}
```

**Template**:

```html
<form [formGroup]="form" (ngSubmit)="onSubmit()">
  <input formControlName="name" />
  @if (form.controls.name.errors?.['required']) {
  <span>Name is required</span>
  }
  <button type="submit" [disabled]="form.invalid">Submit</button>
</form>
```

### Routing

**Define routes** (`app.routes.ts`):

```typescript
import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', component: HomeComponent },
  { path: 'about', component: AboutComponent },
  {
    path: 'feature',
    loadComponent: () => import('./feature/feature.component').then((m) => m.FeatureComponent),
  },
];
```

**Use in template**:

```html
<a routerLink="/">Home</a>
<a routerLink="/about">About</a>
<router-outlet></router-outlet>
```

## Service Patterns

### HTTP Service

**Standard pattern**:

```typescript
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment.development';

interface DataResponse {
  data: DataType[];
}

@Injectable({
  providedIn: 'root',
})
export class DataService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/api`;

  getData(): Observable<DataResponse> {
    return this.http.get<DataResponse>(`${this.apiUrl}/data`);
  }

  createData(data: CreateDataDto): Observable<DataResponse> {
    return this.http.post<DataResponse>(`${this.apiUrl}/data`, data);
  }
}
```

**Using in components**:

```typescript
export class MyComponent implements OnInit {
  private readonly dataService = inject(DataService);
  protected readonly data = signal<Data[]>([]);
  protected readonly loading = signal(false);
  protected readonly error = signal<string | null>(null);

  ngOnInit() {
    this.loadData();
  }

  private loadData() {
    this.loading.set(true);
    this.error.set(null);

    this.dataService.getData().subscribe({
      next: (response) => {
        this.data.set(response.data);
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set('Failed to load data');
        this.loading.set(false);
        console.error('Error:', err);
      },
    });
  }
}
```

## Accessibility Requirements

### Must Pass

- ✅ All AXE checks
- ✅ WCAG AA minimum
- ✅ Keyboard navigation
- ✅ Focus management
- ✅ Color contrast (4.5:1 text, 3:1 large text)
- ✅ ARIA attributes where needed

### Common Patterns

**Form fields**:

```html
<label for="name">Name</label>
<input id="name" type="text" aria-required="true" />
@if (errors()) {
<span role="alert" aria-live="polite">{{ errors() }}</span>
}
```

**Buttons**:

```html
<button type="button" aria-label="Close dialog" (click)="close()">
  <span aria-hidden="true">×</span>
</button>
```

**Loading states**:

```html
<div role="status" aria-live="polite">@if (loading()) { Loading... }</div>
```

**Focus management**:

```typescript
import { ViewChild, ElementRef } from '@angular/core';

@ViewChild('inputRef') inputRef!: ElementRef<HTMLInputElement>;

ngAfterViewInit() {
  this.inputRef.nativeElement.focus();
}
```

## Adding a New Feature

### 1. Create Component

**File**: `src/app/feature/feature.component.ts`

```typescript
import { Component } from '@angular/core';

@Component({
  selector: 'app-feature',
  imports: [],
  templateUrl: './feature.component.html',
  styleUrl: './feature.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FeatureComponent {
  // Implementation
}
```

### 2. Create Template

**File**: `src/app/feature/feature.component.html`

```html
<div>
  <h1>Feature</h1>
  <!-- Content -->
</div>
```

### 3. Add Route (if needed)

**In** `app.routes.ts`:

```typescript
{
  path: 'feature',
  loadComponent: () =>
    import('./feature/feature.component').then(m => m.FeatureComponent),
}
```

### 4. Add Service Method (if needed)

**In** `services/api.service.ts`:

```typescript
getFeatureData(): Observable<FeatureDataResponse> {
  return this.http.get<FeatureDataResponse>(`${this.apiUrl}/feature`);
}
```

## Environment Configuration

### Development (`environments/environment.development.ts`)

```typescript
export const environment = {
  production: false,
  apiUrl: '', // Empty = relative URLs (proxied)
};
```

### Production (`environments/environment.ts`)

```typescript
export const environment = {
  production: true,
  apiUrl: '', // Empty = relative URLs (nginx proxied)
};
```

### Proxy (`proxy.conf.json`)

Proxies `/api` and `/health` to `localhost:3000` in development:

```json
{
  "/api": { "target": "http://localhost:3000", ... },
  "/health": { "target": "http://localhost:3000", ... }
}
```

## Common Patterns

### Loading State

```typescript
protected readonly state = signal<'idle' | 'loading' | 'success' | 'error'>('idle');

private loadData() {
  this.state.set('loading');
  this.service.getData().subscribe({
    next: () => this.state.set('success'),
    error: () => this.state.set('error'),
  });
}
```

**Template**:

```html
@switch (state()) { @case ('loading') {
<p>Loading...</p>
} @case ('success') {
<p>Success!</p>
} @case ('error') {
<p>Error occurred</p>
} }
```

### Form Validation

```typescript
protected readonly form = this.fb.group({
  email: ['', [Validators.required, Validators.email]],
});

protected get emailErrors() {
  const control = this.form.controls.email;
  if (control.errors?.['required']) return 'Email is required';
  if (control.errors?.['email']) return 'Invalid email format';
  return null;
}
```

### Optimistic Updates

```typescript
protected deleteItem(id: number) {
  const original = this.items();
  this.items.update(list => list.filter(item => item.id !== id));

  this.service.deleteItem(id).subscribe({
    error: () => {
      // Rollback on error
      this.items.set(original);
      this.error.set('Failed to delete');
    },
  });
}
```

## Testing

### Component Tests

```typescript
import { ComponentFixture, TestBed } from '@angular/core/testing';

describe('MyComponent', () => {
  let component: MyComponent;
  let fixture: ComponentFixture<MyComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MyComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(MyComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
```

## Common Issues

**Signal not updating in template**:

- Make sure you're calling the signal: `{{ value() }}` not `{{ value }}`
- Check `ChangeDetectionStrategy.OnPush` is set

**Cannot find module errors**:

- Check imports in component `imports` array
- Verify standalone component is exported

**CORS errors**:

- Verify `proxy.conf.json` is configured
- Check `npm start` uses proxy configuration
- In production, verify Nginx proxy

## File Organization

Current (flat structure):

```
app/
├── app.ts
├── app.html
├── app.css
├── app.config.ts
├── app.routes.ts
└── services/
    └── api.service.ts
```

Future (feature-based):

```
app/
├── app.ts
├── app.config.ts
├── app.routes.ts
├── core/              # Singleton services, guards
│   └── services/
├── shared/            # Shared components, pipes, directives
│   ├── components/
│   └── pipes/
└── features/          # Feature modules
    ├── home/
    ├── profile/
    └── settings/
```

## Related Files

- `angular.json` - Angular CLI configuration
- `tsconfig.json` - TypeScript configuration
- `proxy.conf.json` - Development proxy
- `package.json` - Dependencies and scripts
- `../../backend/src/server.ts` - Backend API

---

**Last Updated**: 2025-12-13
**Update This File**: When adding patterns, updating conventions, or changing architecture
