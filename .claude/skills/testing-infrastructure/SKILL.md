---
name: testing-infrastructure
description: Angular testing infrastructure - fixtures, mocks, component harness, and test utilities to eliminate duplication
allowed-tools: Read, Write, Edit, Glob, Grep
---

# Testing Infrastructure Skill

Expert in creating shared testing infrastructure for Angular applications.

## When to Use This Skill

Use this skill when:

- Setting up shared test fixtures and factories
- Creating component test harness
- Building mock services and utilities
- Eliminating duplicate test setup code
- Standardizing test patterns across the codebase

## Problem Statement

**Current issues**:

- Every test file recreates mock data
- Duplicated mock service setup
- No component test harness
- Repetitive TestBed configuration
- Inconsistent test patterns

**Solution**: Centralized testing infrastructure

## Folder Structure

```
apps/frontend/src/testing/
├── fixtures.ts              # Factory functions for test data
├── component-harness.ts     # Base component test harness
├── utils.ts                 # Test utilities
└── mocks/
    ├── api.service.mock.ts
    ├── auth.service.mock.ts
    ├── task.service.mock.ts
    ├── storage.service.mock.ts
    └── ... (other mocks)
```

## Test Fixtures

Factory functions for creating test data.

```typescript
// testing/fixtures.ts
import { Task, Assignment, Child, Household, User } from '@st44/types/schemas';

// Base factory with overrides pattern
export const createMockTask = (overrides?: Partial<Task>): Task => ({
  id: 'test-task-1',
  householdId: 'test-household-1',
  name: 'Test Task',
  description: 'A test task description',
  points: 10,
  active: true,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  ...overrides,
});

export const createMockAssignment = (overrides?: Partial<Assignment>): Assignment => ({
  id: 'test-assignment-1',
  taskId: 'test-task-1',
  childId: 'test-child-1',
  householdId: 'test-household-1',
  status: 'pending',
  dueDate: new Date().toISOString(),
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  ...overrides,
});

export const createMockChild = (overrides?: Partial<Child>): Child => ({
  id: 'test-child-1',
  userId: 'test-user-1',
  householdId: 'test-household-1',
  firstName: 'Test',
  lastName: 'Child',
  dateOfBirth: '2015-01-01',
  points: 0,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  ...overrides,
});

export const createMockHousehold = (overrides?: Partial<Household>): Household => ({
  id: 'test-household-1',
  name: 'Test Household',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  ...overrides,
});

export const createMockUser = (overrides?: Partial<User>): User => ({
  id: 'test-user-1',
  email: 'test@example.com',
  firstName: 'Test',
  lastName: 'User',
  role: 'parent',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  ...overrides,
});

// Array factory helpers
export const createMockTasks = (count: number): Task[] => {
  return Array.from({ length: count }, (_, i) =>
    createMockTask({
      id: `test-task-${i + 1}`,
      name: `Task ${i + 1}`,
    }),
  );
};

export const createMockAssignments = (count: number): Assignment[] => {
  return Array.from({ length: count }, (_, i) =>
    createMockAssignment({
      id: `test-assignment-${i + 1}`,
    }),
  );
};

// Relationship helpers
export const createTaskWithAssignments = (
  taskOverrides?: Partial<Task>,
  assignmentCount = 3,
): { task: Task; assignments: Assignment[] } => {
  const task = createMockTask(taskOverrides);
  const assignments = Array.from({ length: assignmentCount }, (_, i) =>
    createMockAssignment({
      id: `assignment-${i + 1}`,
      taskId: task.id,
    }),
  );

  return { task, assignments };
};
```

## Component Test Harness

Base class for component testing with common utilities.

```typescript
// testing/component-harness.ts
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Type, DebugElement } from '@angular/core';
import { By } from '@angular/platform-browser';

export class ComponentTestHarness<T> {
  fixture: ComponentFixture<T>;
  component: T;
  nativeElement: HTMLElement;

  constructor(componentClass: Type<T>, providers: unknown[] = []) {
    TestBed.configureTestingModule({
      imports: [componentClass],
      providers,
    });

    this.fixture = TestBed.createComponent(componentClass);
    this.component = this.fixture.componentInstance;
    this.nativeElement = this.fixture.nativeElement;
  }

  /**
   * Trigger change detection
   */
  detectChanges(): void {
    this.fixture.detectChanges();
  }

  /**
   * Query single element by CSS selector
   */
  query<E extends HTMLElement = HTMLElement>(selector: string): E | null {
    return this.nativeElement.querySelector<E>(selector);
  }

  /**
   * Query all elements by CSS selector
   */
  queryAll<E extends HTMLElement = HTMLElement>(selector: string): E[] {
    return Array.from(this.nativeElement.querySelectorAll<E>(selector));
  }

  /**
   * Query by DebugElement
   */
  queryDebug(selector: string): DebugElement | null {
    return this.fixture.debugElement.query(By.css(selector));
  }

  /**
   * Query all by DebugElement
   */
  queryAllDebug(selector: string): DebugElement[] {
    return this.fixture.debugElement.queryAll(By.css(selector));
  }

  /**
   * Get text content of element
   */
  getText(selector: string): string {
    const element = this.query(selector);
    return element?.textContent?.trim() || '';
  }

  /**
   * Click element
   */
  click(selector: string): void {
    const element = this.query(selector);
    if (!element) {
      throw new Error(`Element not found: ${selector}`);
    }
    element.click();
    this.detectChanges();
  }

  /**
   * Set input value
   */
  setInputValue(selector: string, value: string): void {
    const input = this.query<HTMLInputElement>(selector);
    if (!input) {
      throw new Error(`Input not found: ${selector}`);
    }
    input.value = value;
    input.dispatchEvent(new Event('input'));
    this.detectChanges();
  }

  /**
   * Check if element exists
   */
  exists(selector: string): boolean {
    return this.query(selector) !== null;
  }

  /**
   * Check if element has class
   */
  hasClass(selector: string, className: string): boolean {
    const element = this.query(selector);
    return element?.classList.contains(className) || false;
  }

  /**
   * Wait for async operations
   */
  async waitForAsync(): Promise<void> {
    this.fixture.detectChanges();
    await this.fixture.whenStable();
  }

  /**
   * Destroy fixture
   */
  destroy(): void {
    this.fixture.destroy();
  }
}
```

## Mock Services

### Mock API Service

```typescript
// testing/mocks/api.service.mock.ts
import { Observable, of, throwError } from 'rxjs';

export class MockApiService {
  private responses = new Map<string, unknown>();
  private errors = new Map<string, Error>();

  /**
   * Set mock response for URL
   */
  setResponse(url: string, data: unknown): void {
    this.responses.set(url, data);
    this.errors.delete(url);
  }

  /**
   * Set mock error for URL
   */
  setError(url: string, error: Error): void {
    this.errors.set(url, error);
    this.responses.delete(url);
  }

  get<T>(url: string): Observable<T> {
    if (this.errors.has(url)) {
      return throwError(() => this.errors.get(url));
    }
    return of(this.responses.get(url) as T);
  }

  post<T>(url: string, _body: unknown): Observable<T> {
    if (this.errors.has(url)) {
      return throwError(() => this.errors.get(url));
    }
    return of(this.responses.get(url) as T);
  }

  put<T>(url: string, _body: unknown): Observable<T> {
    if (this.errors.has(url)) {
      return throwError(() => this.errors.get(url));
    }
    return of(this.responses.get(url) as T);
  }

  delete<T>(url: string): Observable<T> {
    if (this.errors.has(url)) {
      return throwError(() => this.errors.get(url));
    }
    return of(this.responses.get(url) as T);
  }

  reset(): void {
    this.responses.clear();
    this.errors.clear();
  }
}
```

### Mock Storage Service

```typescript
// testing/mocks/storage.service.mock.ts
import { z } from 'zod';

export class MockStorageService {
  private storage = new Map<string, unknown>();

  get<T>(key: string, _schema: z.ZodType<T>): T | null {
    return (this.storage.get(key) as T) || null;
  }

  set<T>(key: string, value: T): void {
    this.storage.set(key, value);
  }

  remove(key: string): void {
    this.storage.delete(key);
  }

  clear(): void {
    this.storage.clear();
  }

  has(key: string): boolean {
    return this.storage.has(key);
  }
}
```

### Mock Auth Service

```typescript
// testing/mocks/auth.service.mock.ts
import { signal } from '@angular/core';
import { User } from '@st44/types/schemas';
import { createMockUser } from '../fixtures';

export class MockAuthService {
  private currentUserSignal = signal<User | null>(null);
  readonly currentUser = this.currentUserSignal.asReadonly();

  private isAuthenticatedSignal = signal(false);
  readonly isAuthenticated = this.isAuthenticatedSignal.asReadonly();

  setUser(user: User | null): void {
    this.currentUserSignal.set(user);
    this.isAuthenticatedSignal.set(user !== null);
  }

  login(): void {
    this.setUser(createMockUser());
  }

  logout(): void {
    this.setUser(null);
  }

  reset(): void {
    this.logout();
  }
}
```

## Test Utilities

```typescript
// testing/utils.ts

/**
 * Wait for specified milliseconds
 */
export const wait = (ms: number): Promise<void> => {
  return new Promise((resolve) => setTimeout(resolve, ms));
};

/**
 * Trigger input event on element
 */
export const triggerInput = (element: HTMLElement, value: string): void => {
  if (element instanceof HTMLInputElement) {
    element.value = value;
    element.dispatchEvent(new Event('input', { bubbles: true }));
  }
};

/**
 * Trigger click event
 */
export const triggerClick = (element: HTMLElement): void => {
  element.click();
  element.dispatchEvent(new MouseEvent('click', { bubbles: true }));
};

/**
 * Find element by data-testid attribute
 */
export const getByTestId = (container: HTMLElement, testId: string): HTMLElement | null => {
  return container.querySelector(`[data-testid="${testId}"]`);
};

/**
 * Find all elements by data-testid attribute
 */
export const getAllByTestId = (container: HTMLElement, testId: string): HTMLElement[] => {
  return Array.from(container.querySelectorAll(`[data-testid="${testId}"]`));
};
```

## Usage Examples

### Using Fixtures

```typescript
import { createMockTask, createMockTasks } from '../testing/fixtures';

describe('TaskCardComponent', () => {
  it('should display task name', () => {
    const task = createMockTask({ name: 'Custom Task Name' });
    // ... test with task
  });

  it('should handle multiple tasks', () => {
    const tasks = createMockTasks(5);
    expect(tasks).toHaveLength(5);
  });
});
```

### Using Component Harness

```typescript
import { ComponentTestHarness } from '../testing/component-harness';
import { TaskCardComponent } from './task-card.component';

describe('TaskCardComponent', () => {
  let harness: ComponentTestHarness<TaskCardComponent>;

  beforeEach(() => {
    harness = new ComponentTestHarness(TaskCardComponent);
  });

  afterEach(() => {
    harness.destroy();
  });

  it('should render task name', () => {
    harness.component.task = createMockTask({ name: 'Test Task' });
    harness.detectChanges();

    expect(harness.getText('.task-name')).toBe('Test Task');
  });

  it('should emit complete event on button click', () => {
    const spy = jasmine.createSpy('complete');
    harness.component.complete.subscribe(spy);

    harness.click('.complete-button');

    expect(spy).toHaveBeenCalled();
  });
});
```

### Using Mock Services

```typescript
import { MockApiService } from '../testing/mocks/api.service.mock';
import { createMockTasks } from '../testing/fixtures';

describe('TaskService', () => {
  let service: TaskService;
  let mockApi: MockApiService;

  beforeEach(() => {
    mockApi = new MockApiService();

    TestBed.configureTestingModule({
      providers: [TaskService, { provide: ApiService, useValue: mockApi }],
    });

    service = TestBed.inject(TaskService);
  });

  it('should fetch tasks', async () => {
    const mockTasks = createMockTasks(3);
    mockApi.setResponse('/api/tasks', mockTasks);

    const tasks = await service.getTasks();

    expect(tasks).toEqual(mockTasks);
  });

  it('should handle errors', async () => {
    mockApi.setError('/api/tasks', new Error('Network error'));

    await expectAsync(service.getTasks()).toBeRejected();
  });
});
```

### Integration Test Example

```typescript
import { ComponentTestHarness } from '../testing/component-harness';
import { MockApiService } from '../testing/mocks/api.service.mock';
import { createMockTasks } from '../testing/fixtures';

describe('TaskListComponent Integration', () => {
  let harness: ComponentTestHarness<TaskListComponent>;
  let mockApi: MockApiService;

  beforeEach(() => {
    mockApi = new MockApiService();

    harness = new ComponentTestHarness(TaskListComponent, [
      { provide: ApiService, useValue: mockApi },
    ]);
  });

  it('should load and display tasks', async () => {
    const tasks = createMockTasks(3);
    mockApi.setResponse('/api/tasks', tasks);

    await harness.component.ngOnInit();
    await harness.waitForAsync();

    const taskCards = harness.queryAll('.task-card');
    expect(taskCards).toHaveLength(3);
  });

  it('should show error on failure', async () => {
    mockApi.setError('/api/tasks', new Error('Failed'));

    await harness.component.ngOnInit();
    await harness.waitForAsync();

    expect(harness.exists('.error-message')).toBe(true);
  });
});
```

## Best Practices

### 1. Use Fixtures for All Test Data

```typescript
// ❌ BAD - Inline test data
const task = {
  id: '1',
  name: 'Task',
  points: 10,
  // ... many properties
};

// ✅ GOOD - Use fixture
const task = createMockTask({ name: 'Task', points: 10 });
```

### 2. Use Harness for Component Tests

```typescript
// ❌ BAD - Manual setup
let fixture: ComponentFixture<MyComponent>;
let component: MyComponent;

beforeEach(() => {
  TestBed.configureTestingModule({ imports: [MyComponent] });
  fixture = TestBed.createComponent(MyComponent);
  component = fixture.componentInstance;
});

// ✅ GOOD - Use harness
let harness: ComponentTestHarness<MyComponent>;

beforeEach(() => {
  harness = new ComponentTestHarness(MyComponent);
});
```

### 3. Use data-testid for Selectors

```html
<!-- component.html -->
<button data-testid="submit-button">Submit</button>

<!-- test -->
<script>
  const button = getByTestId(harness.nativeElement, 'submit-button');
</script>
```

### 4. Reset Mocks Between Tests

```typescript
afterEach(() => {
  mockApi.reset();
  mockStorage.clear();
  mockAuth.reset();
});
```

## Migration Guide

### Before (Duplicated Setup)

```typescript
// task-list.component.spec.ts
describe('TaskListComponent', () => {
  let fixture: ComponentFixture<TaskListComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [TaskListComponent],
    });
    fixture = TestBed.createComponent(TaskListComponent);
  });

  it('test 1', () => {
    const task = { id: '1', name: 'Task' /* ... */ };
    // ... test
  });
});

// task-card.component.spec.ts - SAME setup repeated
describe('TaskCardComponent', () => {
  let fixture: ComponentFixture<TaskCardComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [TaskCardComponent],
    });
    fixture = TestBed.createComponent(TaskCardComponent);
  });

  it('test 1', () => {
    const task = { id: '1', name: 'Task' /* ... */ };
    // ... test
  });
});
```

### After (Shared Infrastructure)

```typescript
// task-list.component.spec.ts
describe('TaskListComponent', () => {
  let harness: ComponentTestHarness<TaskListComponent>;

  beforeEach(() => {
    harness = new ComponentTestHarness(TaskListComponent);
  });

  it('test 1', () => {
    const task = createMockTask();
    // ... test
  });
});

// task-card.component.spec.ts
describe('TaskCardComponent', () => {
  let harness: ComponentTestHarness<TaskCardComponent>;

  beforeEach(() => {
    harness = new ComponentTestHarness(TaskCardComponent);
  });

  it('test 1', () => {
    const task = createMockTask();
    // ... test
  });
});
```

## Success Criteria

Before marking testing infrastructure complete:

- [ ] Fixtures created for all domain models
- [ ] ComponentTestHarness implemented
- [ ] Mock services created for all injectable services
- [ ] Test utilities documented
- [ ] Existing tests migrated to use shared infrastructure
- [ ] No duplicated mock data in test files
- [ ] No duplicated TestBed setup
- [ ] All tests pass with new infrastructure

## Reference

- GitHub Issue #261: Testing Infrastructure
- `.github/agents/frontend-agent.md`: Complete frontend patterns
