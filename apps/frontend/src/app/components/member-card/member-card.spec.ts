import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MemberCard, type MemberCardData } from './member-card';
import { ComponentRef } from '@angular/core';

describe('MemberCard', () => {
  let component: MemberCard;
  let componentRef: ComponentRef<MemberCard>;
  let fixture: ComponentFixture<MemberCard>;

  const mockParentMember: MemberCardData = {
    id: '1',
    name: 'Sarah Johnson',
    email: 'sarah@example.com',
    role: 'parent',
    tasksCompleted: 12,
    totalTasks: 15,
    points: 450,
  };

  const mockChildMember: MemberCardData = {
    id: '2',
    name: 'Alex Johnson',
    role: 'child',
    tasksCompleted: 8,
    totalTasks: 10,
    points: 280,
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MemberCard],
    }).compileComponents();

    fixture = TestBed.createComponent(MemberCard);
    component = fixture.componentInstance;
    componentRef = fixture.componentRef;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should display member name', () => {
    componentRef.setInput('member', mockParentMember);
    fixture.detectChanges();

    const nameElement = fixture.nativeElement.querySelector('.member-name');
    expect(nameElement?.textContent).toContain('Sarah Johnson');
  });

  it('should display the single initial for a full name', () => {
    componentRef.setInput('member', mockParentMember);
    fixture.detectChanges();

    const avatarElement = fixture.nativeElement.querySelector('.member-avatar');
    expect(avatarElement?.textContent?.trim()).toBe('S');
  });

  it('should display the single initial for a single name', () => {
    componentRef.setInput('member', { ...mockParentMember, name: 'Mike' });
    fixture.detectChanges();

    const avatarElement = fixture.nativeElement.querySelector('.member-avatar');
    expect(avatarElement?.textContent?.trim()).toBe('M');
  });

  it('should never put «(deg)» or a symbol in the badge', () => {
    componentRef.setInput('member', { ...mockParentMember, name: 'øyvind (deg)' });
    fixture.detectChanges();

    const avatarElement = fixture.nativeElement.querySelector('.member-avatar');
    expect(avatarElement?.textContent?.trim()).toBe('Ø');
  });

  it('should display parent role', () => {
    componentRef.setInput('member', { ...mockParentMember, points: 0 });
    fixture.detectChanges();

    const meta = fixture.nativeElement.querySelector('.member-meta');
    expect(meta?.textContent!.replace(/\s+/g, ' ').trim()).toBe('Forelder');
    expect(fixture.nativeElement.querySelector('.member-points')).toBeNull();
    expect(fixture.nativeElement.querySelector('.member-stats')).toBeNull();
  });

  it('should display child role', () => {
    componentRef.setInput('member', { ...mockChildMember, points: 340, tasksCompleted: 1, totalTasks: 3 });
    fixture.detectChanges();

    const meta = fixture.nativeElement.querySelector('.member-meta');
    expect(meta?.textContent!.replace(/\s+/g, ' ').trim()).toBe('340 p · 1 av 3 gjort');
    const points = fixture.nativeElement.querySelector('.member-points');
    expect(points?.textContent!.replace(/\s+/g, ' ').trim()).toBe('340 p');
    expect(fixture.nativeElement.querySelector('.member-stats')).toBeNull();
  });

  it('should display child role when stats are hidden', () => {
    componentRef.setInput('member', mockChildMember);
    componentRef.setInput('showStats', false);
    fixture.detectChanges();

    const meta = fixture.nativeElement.querySelector('.member-meta');
    expect(meta?.textContent!.replace(/\s+/g, ' ').trim()).toBe('Barn');
    expect(fixture.nativeElement.querySelector('.member-stats')).toBeNull();
  });

  it('should hide stats when showStats is false', () => {
    componentRef.setInput('member', mockParentMember);
    componentRef.setInput('showStats', false);
    fixture.detectChanges();

    const pointsElement = fixture.nativeElement.querySelector('.member-points');
    expect(pointsElement).toBeNull();
  });

  it('should display zero stats correctly', () => {
    componentRef.setInput('member', {
      ...mockChildMember,
      tasksCompleted: 0,
      totalTasks: 0,
      points: 0,
    });
    fixture.detectChanges();

    const meta = fixture.nativeElement.querySelector('.member-meta');
    expect(meta?.textContent!.replace(/\s+/g, ' ').trim()).toBe('0 p · 0 av 0 gjort');
    expect(fixture.nativeElement.querySelector('.member-stats')).toBeNull();
  });

  it('should display default values for missing stats', () => {
    const memberWithoutStats: MemberCardData = {
      id: '3',
      name: 'Test User',
      role: 'child',
    };

    componentRef.setInput('member', memberWithoutStats);
    fixture.detectChanges();

    const meta = fixture.nativeElement.querySelector('.member-meta');
    expect(meta?.textContent!.replace(/\s+/g, ' ').trim()).toBe('0 p · 0 av 0 gjort');
    expect(fixture.nativeElement.querySelector('.member-stats')).toBeNull();
  });

  it('should apply clickable class when clickable is true', () => {
    componentRef.setInput('member', mockParentMember);
    componentRef.setInput('clickable', true);
    fixture.detectChanges();

    const cardElement = fixture.nativeElement.querySelector('.member-card');
    expect(cardElement?.classList.contains('clickable')).toBe(true);
  });

  it('should not apply clickable class when clickable is false', () => {
    componentRef.setInput('member', mockParentMember);
    componentRef.setInput('clickable', false);
    fixture.detectChanges();

    const cardElement = fixture.nativeElement.querySelector('.member-card');
    expect(cardElement?.classList.contains('clickable')).toBe(false);
  });

  it('should emit click event when clickable and clicked', () => {
    const clickSpy = vi.fn();
    component.cardClick.subscribe(clickSpy);

    componentRef.setInput('member', mockParentMember);
    componentRef.setInput('clickable', true);
    fixture.detectChanges();

    const cardElement = fixture.nativeElement.querySelector('.member-card');
    cardElement?.click();

    expect(clickSpy).toHaveBeenCalledWith('1');
  });

  it('should not emit click event when not clickable', () => {
    const clickSpy = vi.fn();
    component.cardClick.subscribe(clickSpy);

    componentRef.setInput('member', mockParentMember);
    componentRef.setInput('clickable', false);
    fixture.detectChanges();

    const cardElement = fixture.nativeElement.querySelector('.member-card');
    cardElement?.click();

    expect(clickSpy).not.toHaveBeenCalled();
  });

  it('should have correct accessibility attributes when clickable', () => {
    componentRef.setInput('member', mockParentMember);
    componentRef.setInput('clickable', true);
    fixture.detectChanges();

    const cardElement = fixture.nativeElement.querySelector('.member-card');
    expect(cardElement?.getAttribute('role')).toBe('button');
    expect(cardElement?.getAttribute('tabindex')).toBe('0');
    expect(cardElement?.getAttribute('aria-label')).toBe(
      `Vis detaljer for ${mockParentMember.name}`,
    );
  });

  it('should not have button role when not clickable', () => {
    componentRef.setInput('member', mockParentMember);
    componentRef.setInput('clickable', false);
    fixture.detectChanges();

    const cardElement = fixture.nativeElement.querySelector('.member-card');
    expect(cardElement?.getAttribute('role')).toBeNull();
    expect(cardElement?.getAttribute('tabindex')).toBeNull();
  });

  it('should handle keyboard enter key when clickable', () => {
    const clickSpy = vi.fn();
    component.cardClick.subscribe(clickSpy);

    componentRef.setInput('member', mockParentMember);
    componentRef.setInput('clickable', true);
    fixture.detectChanges();

    const cardElement = fixture.nativeElement.querySelector('.member-card');
    const event = new KeyboardEvent('keydown', { key: 'Enter' });
    cardElement?.dispatchEvent(event);

    expect(clickSpy).toHaveBeenCalledWith('1');
  });

  it('should handle keyboard space key when clickable', () => {
    const clickSpy = vi.fn();
    component.cardClick.subscribe(clickSpy);

    componentRef.setInput('member', mockParentMember);
    componentRef.setInput('clickable', true);
    fixture.detectChanges();

    const cardElement = fixture.nativeElement.querySelector('.member-card');
    const event = new KeyboardEvent('keydown', { key: ' ' });
    cardElement?.dispatchEvent(event);

    expect(clickSpy).toHaveBeenCalledWith('1');
  });
});
