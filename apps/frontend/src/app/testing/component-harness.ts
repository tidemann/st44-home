/**
 * Component Test Harness - Base utilities for component testing
 *
 * Provides a standardized way to set up and interact with components
 * in tests, reducing boilerplate and ensuring consistent patterns.
 *
 * @example
 * describe('MyComponent', () => {
 *   let harness: ComponentHarness<MyComponent>;
 *
 *   beforeEach(async () => {
 *     harness = await createComponentHarness(MyComponent, {
 *       providers: [{ provide: MyService, useValue: mockService }]
 *     });
 *   });
 *
 *   it('should render title', () => {
 *     expect(harness.query('.title')?.textContent).toBe('Hello');
 *   });
 * });
 */

import { ComponentFixture, TestBed, type TestBedStatic } from '@angular/core/testing';
import { Type, DebugElement, Signal } from '@angular/core';
import { By } from '@angular/platform-browser';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';

export interface ComponentHarnessConfig {
  /** Additional providers for TestBed */
  providers?: Parameters<TestBedStatic['configureTestingModule']>[0]['providers'];
  /** Additional imports for TestBed */
  imports?: Parameters<TestBedStatic['configureTestingModule']>[0]['imports'];
  /** Whether to skip initial change detection (default: false) */
  skipInitialDetection?: boolean;
  /** Whether to include NoopAnimationsModule (default: true) */
  includeAnimations?: boolean;
}

export interface ComponentHarness<T> {
  /** The Angular ComponentFixture */
  fixture: ComponentFixture<T>;
  /** The component instance */
  component: T;
  /** The native element */
  nativeElement: HTMLElement;
  /** The debug element */
  debugElement: DebugElement;

  /** Trigger change detection */
  detectChanges(): void;
  /** Await all pending async operations */
  whenStable(): Promise<void>;
  /** Detect changes and await stability */
  detectChangesAndWait(): Promise<void>;

  /** Query for a single element by CSS selector */
  query<E extends HTMLElement>(selector: string): E | null;
  /** Query for all elements by CSS selector */
  queryAll<E extends HTMLElement>(selector: string): E[];
  /** Query for a single element by directive/component type */
  queryByDirective<D>(directive: Type<D>): D | null;
  /** Query for all elements by directive/component type */
  queryAllByDirective<D>(directive: Type<D>): D[];

  /** Get element text content */
  getText(selector: string): string;
  /** Check if element exists */
  exists(selector: string): boolean;
  /** Check if element has class */
  hasClass(selector: string, className: string): boolean;

  /** Click an element */
  click(selector: string): void;
  /** Enter text into an input */
  enterText(selector: string, text: string): void;
  /** Simulate keyboard event */
  keyDown(selector: string, key: string, options?: KeyboardEventInit): void;
  /** Trigger blur event */
  blur(selector: string): void;
  /** Trigger focus event */
  focus(selector: string): void;

  /** Get input value */
  getInputValue(selector: string): string;
  /** Check if checkbox/radio is checked */
  isChecked(selector: string): boolean;
  /** Select an option in a select element */
  selectOption(selector: string, value: string): void;

  /** Set component input (for signal-based inputs) */
  setInput<K extends keyof T>(name: K, value: T[K] extends Signal<infer V> ? V : T[K]): void;
  /** Destroy the component */
  destroy(): void;
}

/**
 * Create a component harness for testing
 */
export async function createComponentHarness<T>(
  component: Type<T>,
  config: ComponentHarnessConfig = {},
): Promise<ComponentHarness<T>> {
  const {
    providers = [],
    imports = [],
    skipInitialDetection = false,
    includeAnimations = true,
  } = config;

  const testImports = includeAnimations
    ? [NoopAnimationsModule, component, ...imports]
    : [component, ...imports];

  await TestBed.configureTestingModule({
    imports: testImports,
    providers,
  }).compileComponents();

  const fixture = TestBed.createComponent(component);

  if (!skipInitialDetection) {
    fixture.detectChanges();
  }

  return createHarness(fixture);
}

/**
 * Create a harness from an existing fixture
 */
export function createHarness<T>(fixture: ComponentFixture<T>): ComponentHarness<T> {
  const harness: ComponentHarness<T> = {
    fixture,
    component: fixture.componentInstance,
    nativeElement: fixture.nativeElement,
    debugElement: fixture.debugElement,

    detectChanges(): void {
      fixture.detectChanges();
    },

    async whenStable(): Promise<void> {
      await fixture.whenStable();
    },

    async detectChangesAndWait(): Promise<void> {
      fixture.detectChanges();
      await fixture.whenStable();
    },

    query<E extends HTMLElement>(selector: string): E | null {
      return fixture.nativeElement.querySelector(selector);
    },

    queryAll<E extends HTMLElement>(selector: string): E[] {
      return Array.from(fixture.nativeElement.querySelectorAll(selector));
    },

    queryByDirective<D>(directive: Type<D>): D | null {
      const debugEl = fixture.debugElement.query(By.directive(directive));
      return debugEl?.componentInstance ?? null;
    },

    queryAllByDirective<D>(directive: Type<D>): D[] {
      return fixture.debugElement
        .queryAll(By.directive(directive))
        .map((el) => el.componentInstance);
    },

    getText(selector: string): string {
      const element = harness.query(selector);
      return element?.textContent?.trim() ?? '';
    },

    exists(selector: string): boolean {
      return harness.query(selector) !== null;
    },

    hasClass(selector: string, className: string): boolean {
      const element = harness.query(selector);
      return element?.classList.contains(className) ?? false;
    },

    click(selector: string): void {
      const element = harness.query(selector);
      if (!element) {
        throw new Error(`Element not found: ${selector}`);
      }
      element.click();
      fixture.detectChanges();
    },

    enterText(selector: string, text: string): void {
      const element = harness.query<HTMLInputElement>(selector);
      if (!element) {
        throw new Error(`Input not found: ${selector}`);
      }
      element.value = text;
      element.dispatchEvent(new Event('input', { bubbles: true }));
      element.dispatchEvent(new Event('change', { bubbles: true }));
      fixture.detectChanges();
    },

    keyDown(selector: string, key: string, options: KeyboardEventInit = {}): void {
      const element = harness.query(selector);
      if (!element) {
        throw new Error(`Element not found: ${selector}`);
      }
      const event = new KeyboardEvent('keydown', { key, bubbles: true, ...options });
      element.dispatchEvent(event);
      fixture.detectChanges();
    },

    blur(selector: string): void {
      const element = harness.query(selector);
      if (!element) {
        throw new Error(`Element not found: ${selector}`);
      }
      element.dispatchEvent(new Event('blur', { bubbles: true }));
      fixture.detectChanges();
    },

    focus(selector: string): void {
      const element = harness.query(selector);
      if (!element) {
        throw new Error(`Element not found: ${selector}`);
      }
      element.dispatchEvent(new Event('focus', { bubbles: true }));
      fixture.detectChanges();
    },

    getInputValue(selector: string): string {
      const element = harness.query<HTMLInputElement>(selector);
      return element?.value ?? '';
    },

    isChecked(selector: string): boolean {
      const element = harness.query<HTMLInputElement>(selector);
      return element?.checked ?? false;
    },

    selectOption(selector: string, value: string): void {
      const element = harness.query<HTMLSelectElement>(selector);
      if (!element) {
        throw new Error(`Select not found: ${selector}`);
      }
      element.value = value;
      element.dispatchEvent(new Event('change', { bubbles: true }));
      fixture.detectChanges();
    },

    setInput<K extends keyof T>(name: K, value: T[K] extends Signal<infer V> ? V : T[K]): void {
      const componentAny = fixture.componentInstance as Record<string, unknown>;
      const inputValue = componentAny[name as string];

      // Check if it's a writable signal (has .set method)
      if (inputValue && typeof inputValue === 'function' && 'set' in inputValue) {
        (inputValue as { set: (v: unknown) => void }).set(value);
      } else {
        componentAny[name as string] = value;
      }
      fixture.detectChanges();
    },

    destroy(): void {
      fixture.destroy();
    },
  };

  return harness;
}

/**
 * Wait for a condition to be true
 */
export async function waitFor(
  condition: () => boolean,
  timeout = 5000,
  interval = 100,
): Promise<void> {
  const start = Date.now();
  while (!condition()) {
    if (Date.now() - start > timeout) {
      throw new Error('Timeout waiting for condition');
    }
    await new Promise((resolve) => setTimeout(resolve, interval));
  }
}

/**
 * Flush all pending microtasks
 */
export async function flushMicrotasks(): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 0));
}
