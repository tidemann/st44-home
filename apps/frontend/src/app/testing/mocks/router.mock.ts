/**
 * Mock Router and ActivatedRoute for testing
 *
 * Provides mock implementations for Angular router services
 * commonly used in component tests.
 *
 * @example
 * const { router, route } = createMockRouter();
 *
 * TestBed.configureTestingModule({
 *   providers: [
 *     { provide: Router, useValue: router },
 *     { provide: ActivatedRoute, useValue: route }
 *   ]
 * });
 */

import { vi } from 'vitest';
import { BehaviorSubject, of } from 'rxjs';
import type { Params, ParamMap } from '@angular/router';

export interface MockRouter {
  navigate: ReturnType<typeof vi.fn>;
  navigateByUrl: ReturnType<typeof vi.fn>;
  events: BehaviorSubject<unknown>;
  url: string;
}

export interface MockActivatedRoute {
  snapshot: {
    params: Params;
    queryParams: Params;
    paramMap: MockParamMap;
    queryParamMap: MockParamMap;
  };
  params: BehaviorSubject<Params>;
  queryParams: BehaviorSubject<Params>;
  paramMap: BehaviorSubject<MockParamMap>;
  queryParamMap: BehaviorSubject<MockParamMap>;
}

export interface MockParamMap extends ParamMap {
  params: Params;
  keys: string[];
  has: (name: string) => boolean;
  get: (name: string) => string | null;
  getAll: (name: string) => string[];
}

/**
 * Create a mock ParamMap from a params object
 */
export function createMockParamMap(params: Params = {}): MockParamMap {
  return {
    params,
    keys: Object.keys(params),
    has: (name: string) => name in params,
    get: (name: string) => params[name] ?? null,
    getAll: (name: string) => (params[name] ? [params[name]] : []),
  };
}

/**
 * Create a mock Router
 */
export function createMockRouter(initialUrl = '/'): MockRouter {
  return {
    navigate: vi.fn().mockResolvedValue(true),
    navigateByUrl: vi.fn().mockResolvedValue(true),
    events: new BehaviorSubject<unknown>(null),
    url: initialUrl,
  };
}

/**
 * Create a mock ActivatedRoute
 */
export function createMockActivatedRoute(
  params: Params = {},
  queryParams: Params = {},
): MockActivatedRoute {
  const paramMap = createMockParamMap(params);
  const queryParamMap = createMockParamMap(queryParams);

  return {
    snapshot: {
      params,
      queryParams,
      paramMap,
      queryParamMap,
    },
    params: new BehaviorSubject<Params>(params),
    queryParams: new BehaviorSubject<Params>(queryParams),
    paramMap: new BehaviorSubject<MockParamMap>(paramMap),
    queryParamMap: new BehaviorSubject<MockParamMap>(queryParamMap),
  };
}

/**
 * Create both Router and ActivatedRoute mocks
 */
export function createMockRouterAndRoute(
  initialUrl = '/',
  params: Params = {},
  queryParams: Params = {},
): { router: MockRouter; route: MockActivatedRoute } {
  return {
    router: createMockRouter(initialUrl),
    route: createMockActivatedRoute(params, queryParams),
  };
}

/**
 * Update route params (triggers observable emission)
 */
export function updateRouteParams(route: MockActivatedRoute, params: Params): void {
  const paramMap = createMockParamMap(params);
  route.snapshot.params = params;
  route.snapshot.paramMap = paramMap;
  route.params.next(params);
  route.paramMap.next(paramMap);
}

/**
 * Update route query params (triggers observable emission)
 */
export function updateRouteQueryParams(route: MockActivatedRoute, queryParams: Params): void {
  const queryParamMap = createMockParamMap(queryParams);
  route.snapshot.queryParams = queryParams;
  route.snapshot.queryParamMap = queryParamMap;
  route.queryParams.next(queryParams);
  route.queryParamMap.next(queryParamMap);
}
