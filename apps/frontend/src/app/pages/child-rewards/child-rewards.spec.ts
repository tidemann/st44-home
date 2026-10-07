import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { of, throwError } from 'rxjs';
import type { RewardRedemption } from '@st44/types';
import { ChildRewards } from './child-rewards';
import { RewardService, type ChildReward } from '../../services/reward.service';

describe('ChildRewards', () => {
  let component: ChildRewards;
  let fixture: ComponentFixture<ChildRewards>;
  let childRewards: ReturnType<typeof signal<ChildReward[]>>;
  let pointsBalance: ReturnType<typeof signal<number>>;
  let mockRewardService: Record<string, unknown> & {
    redeemReward: ReturnType<typeof vi.fn>;
    loadChildRewards: ReturnType<typeof vi.fn>;
  };

  const reward = (overrides: Partial<ChildReward>): ChildReward => ({
    id: 'reward-1',
    householdId: 'h-1',
    name: 'Kino',
    description: null,
    pointsCost: 50,
    quantity: null,
    active: true,
    createdAt: '2026-10-01T10:00:00.000Z',
    updatedAt: '2026-10-01T10:00:00.000Z',
    available: true,
    canAfford: true,
    ...overrides,
  });

  const redemption = (overrides: Partial<RewardRedemption>): RewardRedemption => ({
    id: 'r-1',
    householdId: 'h-1',
    rewardId: 'reward-1',
    childId: 'c-1',
    pointsSpent: 50,
    status: 'pending',
    redeemedAt: '2026-10-07T10:00:00.000Z',
    fulfilledAt: null,
    decidedAt: null,
    rejectionReason: null,
    ...overrides,
  });

  beforeEach(async () => {
    childRewards = signal<ChildReward[]>([]);
    pointsBalance = signal(30);
    mockRewardService = {
      childRewards,
      pointsBalance,
      childRewardsLoading: signal(false),
      childRewardsError: signal(null),
      childRedemptions: signal<RewardRedemption[]>([]),
      loadChildRewards: vi.fn().mockReturnValue(of({})),
      loadChildRedemptions: vi.fn().mockReturnValue(of([])),
      redeemReward: vi.fn().mockReturnValue(of({})),
    };

    await TestBed.configureTestingModule({
      imports: [ChildRewards],
      providers: [{ provide: RewardService, useValue: mockRewardService }],
    }).compileComponents();

    fixture = TestBed.createComponent(ChildRewards);
    component = fixture.componentInstance;
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('says how many points are missing', () => {
    expect(component.missing(reward({ pointsCost: 50 }))).toBe(20);
    expect(component.missing(reward({ pointsCost: 10 }))).toBe(0);
  });

  it('finds the reward name for a new request that comes back without it', () => {
    childRewards.set([reward({ id: 'reward-1', name: 'Kino' })]);
    expect(component.rewardName(redemption({ rewardName: 'Is' }))).toBe('Is');
    expect(component.rewardName(redemption({}))).toBe('Kino');
    expect(component.rewardName(redemption({ rewardId: 'gone' }))).toBe('');
  });

  it('opens the confirm sheet only for a reward the child can get', () => {
    component.ask(reward({ canAfford: false }));
    expect(component.confirming()).toBeNull();

    component.ask(reward({ available: false }));
    expect(component.confirming()).toBeNull();

    const kino = reward({});
    component.ask(kino);
    expect(component.confirming()).toBe(kino);
  });

  it('sends the request, closes the sheet and clears the message after 6 seconds', () => {
    vi.useFakeTimers();
    component.ask(reward({}));
    component.confirmAsk();

    expect(mockRewardService.redeemReward).toHaveBeenCalledWith('reward-1');
    expect(component.confirming()).toBeNull();
    expect(component.successMessage()).toContain('Kino');
    expect(mockRewardService.loadChildRewards).toHaveBeenCalled();

    vi.advanceTimersByTime(6000);
    expect(component.successMessage()).toBeNull();
  });

  it('keeps the second message for its full 6 seconds', () => {
    vi.useFakeTimers();
    component.ask(reward({ name: 'Kino' }));
    component.confirmAsk();
    vi.advanceTimersByTime(4000);

    component.ask(reward({ id: 'reward-2', name: 'Is' }));
    component.confirmAsk();
    vi.advanceTimersByTime(4000);
    expect(component.successMessage()).toContain('Is');

    vi.advanceTimersByTime(2000);
    expect(component.successMessage()).toBeNull();
  });

  it('keeps the sheet open with a message when the request fails', () => {
    mockRewardService.redeemReward.mockReturnValue(throwError(() => new Error('500')));
    const kino = reward({});
    component.ask(kino);
    component.confirmAsk();

    expect(component.confirming()).toBe(kino);
    expect(component.asking()).toBe(false);
    expect(component.askError()).toContain('Det gikk ikke');
  });
});
