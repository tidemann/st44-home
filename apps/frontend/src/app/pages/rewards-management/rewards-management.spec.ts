import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal, computed } from '@angular/core';
import { Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import type { RewardRedemption } from '@st44/types';
import { RewardsManagementComponent } from './rewards-management';
import { RewardService } from '../../services/reward.service';
import { HouseholdService } from '../../services/household.service';

describe('RewardsManagementComponent', () => {
  let component: RewardsManagementComponent;
  let fixture: ComponentFixture<RewardsManagementComponent>;
  let redemptions: ReturnType<typeof signal<RewardRedemption[]>>;
  let mockRewardService: Record<string, unknown> & {
    approveRedemption: ReturnType<typeof vi.fn>;
    rejectRedemption: ReturnType<typeof vi.fn>;
    undoRedemption: ReturnType<typeof vi.fn>;
  };

  const minutesAgo = (minutes: number) => new Date(Date.now() - minutes * 60_000).toISOString();

  const redemption = (overrides: Partial<RewardRedemption>): RewardRedemption => ({
    id: 'r-1',
    householdId: 'h-1',
    rewardId: 'reward-1',
    childId: 'c-1',
    pointsSpent: 20,
    status: 'pending',
    redeemedAt: minutesAgo(30),
    fulfilledAt: null,
    decidedAt: null,
    rejectionReason: null,
    rewardName: 'Kino',
    childName: 'Emma',
    ...overrides,
  });

  beforeEach(async () => {
    redemptions = signal<RewardRedemption[]>([]);
    mockRewardService = {
      rewards: signal([]),
      loading: signal(false),
      error: signal(null),
      redemptions,
      redemptionsLoading: signal(false),
      pendingRedemptions: computed(() => redemptions().filter((r) => r.status === 'pending')),
      loadRewards: vi.fn().mockReturnValue(of([])),
      loadRedemptions: vi.fn().mockReturnValue(of([])),
      approveRedemption: vi.fn().mockReturnValue(of({})),
      rejectRedemption: vi.fn().mockReturnValue(of({})),
      undoRedemption: vi.fn().mockReturnValue(of({})),
      fulfillRedemption: vi.fn().mockReturnValue(of({})),
    };

    await TestBed.configureTestingModule({
      imports: [RewardsManagementComponent],
      providers: [
        { provide: RewardService, useValue: mockRewardService },
        { provide: HouseholdService, useValue: { getActiveHouseholdId: () => 'h-1' } },
        { provide: Router, useValue: { navigate: vi.fn() } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(RewardsManagementComponent);
    component = fixture.componentInstance;
  });

  it('puts waiting requests and fresh answers first, older answers in the right lists', () => {
    redemptions.set([
      redemption({ id: 'pending' }),
      redemption({ id: 'fresh-yes', status: 'approved', decidedAt: minutesAgo(1) }),
      redemption({ id: 'old-yes', status: 'approved', decidedAt: minutesAgo(10) }),
      redemption({ id: 'old-no', status: 'rejected', decidedAt: minutesAgo(10) }),
      redemption({ id: 'given', status: 'fulfilled', decidedAt: minutesAgo(60) }),
    ]);

    expect(component.waiting().map((r) => r.id)).toEqual(['pending', 'fresh-yes']);
    expect(component.toGive().map((r) => r.id)).toEqual(['old-yes']);
    expect(component.history().map((r) => r.id)).toEqual(['old-no', 'given']);
  });

  it('allows undo only for 5 minutes after a yes or a no', () => {
    expect(component.canUndo(redemption({ status: 'approved', decidedAt: minutesAgo(4) }))).toBe(
      true,
    );
    expect(component.canUndo(redemption({ status: 'rejected', decidedAt: minutesAgo(6) }))).toBe(
      false,
    );
    expect(component.canUndo(redemption({ status: 'pending' }))).toBe(false);
    expect(component.canUndo(redemption({ status: 'approved', decidedAt: null }))).toBe(false);
  });

  it('measures the undo window on the server clock when this device is behind', () => {
    // The server is 10 minutes ahead of this device
    const serverNow = new Date(Date.now() + 10 * 60_000).toISOString();
    const answered = redemption({ status: 'approved', decidedAt: serverNow });
    mockRewardService.approveRedemption.mockReturnValue(of(answered));

    component.approve(redemption({}));

    expect(component.canUndo(answered)).toBe(true);
    const sixMinutesBefore = new Date(Date.parse(serverNow) - 6 * 60_000).toISOString();
    expect(component.canUndo(redemption({ status: 'approved', decidedAt: sixMinutesBefore }))).toBe(
      false,
    );
  });

  it('says no only with a reason, and sends the reason', () => {
    const request = redemption({});
    component.startReject(request);

    component.rejectReason.set('   ');
    component.confirmReject(request);
    expect(mockRewardService.rejectRedemption).not.toHaveBeenCalled();

    component.rejectReason.set('Ikke i dag');
    component.confirmReject(request);
    expect(mockRewardService.rejectRedemption).toHaveBeenCalledWith('h-1', 'r-1', 'Ikke i dag');
    expect(component.rejectingId()).toBeNull();
  });

  it('shows the receipt with "Angre" after a yes and undoes it', () => {
    redemptions.set([redemption({ status: 'approved', decidedAt: minutesAgo(0) })]);
    fixture.detectChanges();

    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('Du sa ja til Kino for Emma.');

    const undoButton = Array.from(
      fixture.nativeElement.querySelectorAll('button') as NodeListOf<HTMLButtonElement>,
    ).find((b) => b.textContent?.trim() === 'Angre');
    undoButton?.click();
    expect(mockRewardService.undoRedemption).toHaveBeenCalledWith('h-1', 'r-1');
  });

  it('shows a message when an answer fails', () => {
    mockRewardService.approveRedemption.mockReturnValue(throwError(() => new Error('409')));
    component.approve(redemption({}));
    expect(component.actionError()).toContain('Det gikk ikke');
    expect(component.busyId()).toBeNull();
  });
});
