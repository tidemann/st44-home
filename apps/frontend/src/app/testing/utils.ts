/**
 * Test Utilities - Common testing helpers and patterns
 *
 * This module provides utility functions for common testing scenarios
 * such as async operations, DOM queries, and test setup.
 *
 * @example
 * import { waitForAsync, expectAsync, fakeDelay } from '../../testing/utils';
 */

import { fakeAsync, tick, flush } from '@angular/core/testing';
import { Observable, of, throwError, delay } from 'rxjs';

// =============================================================================
// Async Utilities
// =============================================================================

/**
 * Create a delayed observable (useful for testing loading states)
 */
export function delayedOf<T>(value: T, delayMs = 100): Observable<T> {
  return of(value).pipe(delay(delayMs));
}

/**
 * Create a delayed error observable
 */
export function delayedError<T>(error: Error | string, delayMs = 100): Observable<T> {
  const err = typeof error === 'string' ? new Error(error) : error;
  return throwError(() => err).pipe(delay(delayMs));
}

/**
 * Execute a callback after a fake async delay
 * Must be used inside fakeAsync zone
 */
export function fakeDelay(ms: number): void {
  tick(ms);
}

/**
 * Flush all pending async operations in fakeAsync zone
 */
export function flushAll(): void {
  flush();
}

// =============================================================================
// Assertion Helpers
// =============================================================================

/**
 * Wait for an observable to emit a value and return it
 */
export async function getObservableValue<T>(observable: Observable<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    observable.subscribe({
      next: resolve,
      error: reject,
    });
  });
}

/**
 * Wait for an observable to emit an error and return it
 */
export async function getObservableError(observable: Observable<unknown>): Promise<Error> {
  return new Promise((resolve, reject) => {
    observable.subscribe({
      next: () => reject(new Error('Expected observable to error, but it emitted a value')),
      error: (error) => resolve(error instanceof Error ? error : new Error(String(error))),
      complete: () => reject(new Error('Expected observable to error, but it completed')),
    });
  });
}

/**
 * Assert that an observable completes without error
 */
export async function expectObservableComplete(observable: Observable<unknown>): Promise<void> {
  return new Promise((resolve, reject) => {
    observable.subscribe({
      error: reject,
      complete: resolve,
    });
  });
}

// =============================================================================
// DOM Utilities
// =============================================================================

/**
 * Find all elements matching a selector in a container
 */
export function findAll<E extends HTMLElement>(container: HTMLElement, selector: string): E[] {
  return Array.from(container.querySelectorAll<E>(selector));
}

/**
 * Find first element matching a selector, throws if not found
 */
export function findOrFail<E extends HTMLElement>(container: HTMLElement, selector: string): E {
  const element = container.querySelector<E>(selector);
  if (!element) {
    throw new Error(`Element not found: ${selector}`);
  }
  return element;
}

/**
 * Get all text content from elements matching a selector
 */
export function getTextContents(container: HTMLElement, selector: string): string[] {
  return findAll(container, selector).map((el) => el.textContent?.trim() ?? '');
}

/**
 * Simulate user typing in an input
 */
export function typeInInput(input: HTMLInputElement, text: string): void {
  input.focus();
  input.value = text;
  input.dispatchEvent(new Event('input', { bubbles: true }));
  input.dispatchEvent(new Event('change', { bubbles: true }));
}

/**
 * Simulate clicking an element
 */
export function clickElement(element: HTMLElement): void {
  element.click();
}

/**
 * Simulate pressing a key on an element
 */
export function pressKey(
  element: HTMLElement,
  key: string,
  options: Partial<KeyboardEventInit> = {},
): void {
  element.dispatchEvent(
    new KeyboardEvent('keydown', {
      key,
      bubbles: true,
      cancelable: true,
      ...options,
    }),
  );
}

/**
 * Simulate pressing Enter key
 */
export function pressEnter(element: HTMLElement): void {
  pressKey(element, 'Enter');
}

/**
 * Simulate pressing Escape key
 */
export function pressEscape(element: HTMLElement): void {
  pressKey(element, 'Escape');
}

/**
 * Simulate pressing Space key
 */
export function pressSpace(element: HTMLElement): void {
  pressKey(element, ' ');
}

// =============================================================================
// Form Utilities
// =============================================================================

/**
 * Fill a form with data
 */
export function fillForm(container: HTMLElement, data: Record<string, string>): void {
  for (const [name, value] of Object.entries(data)) {
    const input = container.querySelector<HTMLInputElement>(
      `[name="${name}"], #${name}, [formControlName="${name}"]`,
    );
    if (input) {
      typeInInput(input, value);
    }
  }
}

/**
 * Get form values as an object
 */
export function getFormValues(form: HTMLFormElement): Record<string, string> {
  const formData = new FormData(form);
  const values: Record<string, string> = {};
  formData.forEach((value, key) => {
    values[key] = value.toString();
  });
  return values;
}

// =============================================================================
// Wait Utilities
// =============================================================================

/**
 * Wait for next animation frame
 */
export function waitForAnimationFrame(): Promise<void> {
  return new Promise((resolve) => requestAnimationFrame(() => resolve()));
}

/**
 * Wait for a specific number of milliseconds
 */
export function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Wait for DOM to be stable (no pending mutations)
 */
export function waitForDomStable(element: HTMLElement, timeout = 1000): Promise<void> {
  return new Promise((resolve, reject) => {
    let timeoutId: ReturnType<typeof setTimeout>;
    let lastMutation = Date.now();

    const observer = new MutationObserver(() => {
      lastMutation = Date.now();
    });

    observer.observe(element, {
      childList: true,
      subtree: true,
      attributes: true,
    });

    const checkStable = (): void => {
      if (Date.now() - lastMutation > 50) {
        observer.disconnect();
        clearTimeout(timeoutId);
        resolve();
      } else {
        setTimeout(checkStable, 10);
      }
    };

    timeoutId = setTimeout(() => {
      observer.disconnect();
      reject(new Error('Timeout waiting for DOM to stabilize'));
    }, timeout);

    checkStable();
  });
}

// =============================================================================
// Test Data Utilities
// =============================================================================

/**
 * Create a range of numbers (useful for generating test data)
 */
export function range(start: number, end: number): number[] {
  return Array.from({ length: end - start + 1 }, (_, i) => start + i);
}

/**
 * Pick random items from an array
 */
export function pickRandom<T>(array: T[], count = 1): T[] {
  const shuffled = [...array].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

/**
 * Create a mock date string for testing
 */
export function mockDate(daysFromToday = 0): string {
  const date = new Date();
  date.setDate(date.getDate() + daysFromToday);
  return date.toISOString().split('T')[0];
}

/**
 * Create a mock datetime string for testing
 */
export function mockDateTime(hoursFromNow = 0): string {
  const date = new Date();
  date.setHours(date.getHours() + hoursFromNow);
  return date.toISOString();
}
