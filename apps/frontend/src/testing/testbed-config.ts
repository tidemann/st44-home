/**
 * Angular TestBed Configuration Helpers
 *
 * Simplifies TestBed setup for common testing scenarios
 */

import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Router } from '@angular/router';
import { vi } from 'vitest';
import type { Type } from '@angular/core';

/**
 * Mock Router for testing
 */
export interface MockRouter {
  navigate: ReturnType<typeof vi.fn>;
  navigateByUrl: ReturnType<typeof vi.fn>;
  url: string;
}

export function createMockRouter(initialUrl = '/'): MockRouter {
  return {
    navigate: vi.fn().mockResolvedValue(true),
    navigateByUrl: vi.fn().mockResolvedValue(true),
    url: initialUrl,
  };
}

/**
 * Configure TestBed for service testing with HTTP
 */
export interface ServiceTestConfig<T> {
  service: Type<T>;
  mocks?: Record<string, unknown>;
  providers?: unknown[];
}

export interface ServiceTestBed<T> {
  service: T;
  httpMock: HttpTestingController;
  mockRouter?: MockRouter;
}

export function configureServiceTest<T>(config: ServiceTestConfig<T>): ServiceTestBed<T> {
  // Clear storage before each test
  localStorage.clear();
  sessionStorage.clear();

  const providers: unknown[] = [
    provideHttpClient(),
    provideHttpClientTesting(),
    config.service,
    ...(config.providers ?? []),
  ];

  // Add mocks as providers
  let mockRouter: MockRouter | undefined;
  if (config.mocks) {
    for (const [token, value] of Object.entries(config.mocks)) {
      if (token === 'Router') {
        mockRouter = value as MockRouter;
        providers.push({ provide: Router, useValue: mockRouter });
      } else {
        providers.push({ provide: token, useValue: value });
      }
    }
  }

  TestBed.configureTestingModule({ providers });

  return {
    service: TestBed.inject(config.service),
    httpMock: TestBed.inject(HttpTestingController),
    mockRouter,
  };
}

/**
 * Configure TestBed for component testing
 */
export interface ComponentTestConfig<T> {
  component: Type<T>;
  imports?: unknown[];
  providers?: unknown[];
  declarations?: unknown[];
}

export interface ComponentTestBed<T> {
  fixture: ComponentFixture<T>;
  component: T;
  element: HTMLElement;
  httpMock?: HttpTestingController;
  mockRouter?: MockRouter;
}

export function configureComponentTest<T>(config: ComponentTestConfig<T>): ComponentTestBed<T> {
  // Clear storage before each test
  localStorage.clear();
  sessionStorage.clear();

  const providers = [...(config.providers ?? [])];
  let httpMock: HttpTestingController | undefined;
  let mockRouter: MockRouter | undefined;

  // Check if HTTP testing is needed
  const needsHttp = config.providers?.some((p) => String(p).includes('provideHttpClient'));
  if (needsHttp) {
    providers.push(provideHttpClient(), provideHttpClientTesting());
  }

  TestBed.configureTestingModule({
    imports: config.imports ?? [],
    declarations: config.declarations ?? [],
    providers,
  });

  const fixture = TestBed.createComponent(config.component);
  const component = fixture.componentInstance;
  const element = fixture.nativeElement as HTMLElement;

  if (needsHttp) {
    httpMock = TestBed.inject(HttpTestingController);
  }

  return {
    fixture,
    component,
    element,
    httpMock,
    mockRouter,
  };
}

/**
 * Helper to get element from fixture
 */
export function getElement<T>(fixture: ComponentFixture<T>): HTMLElement {
  return fixture.nativeElement as HTMLElement;
}

/**
 * Helper to query element
 */
export function queryElement<T>(
  fixture: ComponentFixture<T>,
  selector: string,
): HTMLElement | null {
  const element = getElement(fixture);
  return element.querySelector(selector);
}

/**
 * Helper to query all elements
 */
export function queryAllElements<T>(fixture: ComponentFixture<T>, selector: string): HTMLElement[] {
  const element = getElement(fixture);
  return Array.from(element.querySelectorAll(selector));
}

/**
 * Helper to trigger change detection and wait
 */
export async function detectChanges<T>(fixture: ComponentFixture<T>): Promise<void> {
  fixture.detectChanges();
  await fixture.whenStable();
}

/**
 * Helper to set input value and trigger events
 */
export async function setInputValue<T>(
  fixture: ComponentFixture<T>,
  selector: string,
  value: string,
): Promise<void> {
  const input = queryElement(fixture, selector) as HTMLInputElement;
  if (!input) {
    throw new Error(`Input not found: ${selector}`);
  }

  input.value = value;
  input.dispatchEvent(new Event('input'));
  input.dispatchEvent(new Event('change'));
  await detectChanges(fixture);
}

/**
 * Helper to click element
 */
export async function clickElement<T>(
  fixture: ComponentFixture<T>,
  selector: string,
): Promise<void> {
  const element = queryElement(fixture, selector);
  if (!element) {
    throw new Error(`Element not found: ${selector}`);
  }

  element.click();
  await detectChanges(fixture);
}

/**
 * Helper to get text content
 */
export function getTextContent<T>(fixture: ComponentFixture<T>, selector: string): string {
  const element = queryElement(fixture, selector);
  return element?.textContent?.trim() ?? '';
}

/**
 * Helper to check if element exists
 */
export function hasElement<T>(fixture: ComponentFixture<T>, selector: string): boolean {
  return queryElement(fixture, selector) !== null;
}

/**
 * Helper to check if element has class
 */
export function hasClass<T>(
  fixture: ComponentFixture<T>,
  selector: string,
  className: string,
): boolean {
  const element = queryElement(fixture, selector);
  return element?.classList.contains(className) ?? false;
}

/**
 * Helper to wait for condition
 */
export async function waitForCondition(
  condition: () => boolean,
  timeoutMs = 5000,
  intervalMs = 100,
): Promise<void> {
  const startTime = Date.now();

  while (Date.now() - startTime < timeoutMs) {
    if (condition()) {
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }

  throw new Error(`Timeout waiting for condition after ${timeoutMs}ms`);
}
