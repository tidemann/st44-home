import { describe, it, expect, beforeEach, vi } from 'vitest';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, ActivatedRouteSnapshot, RouterStateSnapshot, UrlTree } from '@angular/router';
import { roleGuard } from './role.guard';
import { AuthService } from '../services/auth.service';
import { HouseholdStore } from '../stores/household.store';

type Role = 'admin' | 'parent' | 'child';

// ST-2227: an account that is admin elsewhere (login role) and child in the active household
describe('roleGuard (active household, stale session)', () => {
  const parentTree = { to: '/home' } as unknown as UrlTree;
  const childTree = { to: '/my-tasks' } as unknown as UrlTree;
  let active: ReturnType<typeof signal<{ id: string; role: Role } | null>>;
  let autoActivate: ReturnType<typeof vi.fn>;

  const run = (roles: Role[]) =>
    TestBed.runInInjectionContext(() =>
      roleGuard(roles)({} as ActivatedRouteSnapshot, { url: '/family' } as RouterStateSnapshot),
    );

  beforeEach(() => {
    active = signal<{ id: string; role: Role } | null>(null);
    autoActivate = vi.fn();
    TestBed.configureTestingModule({
      providers: [
        {
          provide: AuthService,
          useValue: { isAuthenticated: () => true, getUserRole: () => 'admin' as Role },
        },
        {
          provide: HouseholdStore,
          useValue: { activeHousehold: active, autoActivateHousehold: autoActivate },
        },
        {
          provide: Router,
          useValue: {
            createUrlTree: (c: string[]) => (c[0] === '/home' ? parentTree : childTree),
          },
        },
      ],
    });
  });

  it('no active household: loads households first and uses the role there', async () => {
    autoActivate.mockImplementation(async () => active.set({ id: 'h-child', role: 'child' }));
    expect(await run(['admin', 'parent'])).toBe(childTree);
    expect(autoActivate).toHaveBeenCalledOnce();
  });

  it('household load fails: never falls back to the admin login role', async () => {
    autoActivate.mockRejectedValue(new Error('offline'));
    expect(await run(['admin', 'parent'])).toBe(childTree);
    expect(await run(['child'])).toBe(true);
  });

  it('active household known: no reload, its role decides', async () => {
    active.set({ id: 'h-admin', role: 'admin' });
    expect(await run(['admin', 'parent'])).toBe(true);
    expect(autoActivate).not.toHaveBeenCalled();
  });

  it('no households at all (new account): login role still works', async () => {
    autoActivate.mockResolvedValue(undefined);
    expect(await run(['admin', 'parent'])).toBe(true);
  });
});
