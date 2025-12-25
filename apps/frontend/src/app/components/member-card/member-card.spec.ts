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

  it('should display correct initials for full name', () => {
    componentRef.setInput('member', mockParentMember);
    fixture.detectChanges();

    const avatarElement = fixture.nativeElement.querySelector('.member-avatar');
    expect(avatarElement?.textContent?.trim()).toBe('SJ');
  });

  it('should display initials for single name', () => {
    componentRef.setInput('member', { ...mockParentMember, name: 'Mike' });
    fixture.detectChanges();

    const avatarElement = fixture.nativeElement.querySelector('.member-avatar');
    expect(avatarElement?.textContent?.trim()).toBe('MI');
  });

  it('should display parent role', () => {
    componentRef.setInput('member', mockParentMember);
    fixture.detectChanges();

    const roleElement = fixture.nativeElement.querySelector('.member-role');
    expect(roleElement?.textContent).toContain('Parent');
    expect(roleElement?.classList.contains('role-parent')).toBe(true);
  });

  it('should display child role', () => {
    componentRef.setInput('member', mockChildMember);
    fixture.detectChanges();

    const roleElement = fixture.nativeElement.querySelector('.member-role');
    expect(roleElement?.textContent).toContain('Child');
    expect(roleElement?.classList.contains('role-child')).toBe(true);
  });

  it('should display stats when showStats is true', () => {
    componentRef.setInput('member', mockParentMember);
    componentRef.setInput('showStats', true);
    fixture.detectChanges();

    const statsElement = fixture.nativeElement.querySelector('.member-stats');
    expect(statsElement).toBeTruthy();

    const pointsElement = fixture.nativeElement.querySelector('.member-points');
    expect(pointsElement?.textContent).toContain('450 pts');

    const tasksElement = fixture.nativeElement.querySelector('.member-tasks');
    expect(tasksElement?.textContent).toContain('12/15 tasks');
  });

  it('should hide stats when showStats is false', () => {
    componentRef.setInput('member', mockParentMember);
    componentRef.setInput('showStats', false);
    fixture.detectChanges();

    const statsElement = fixture.nativeElement.querySelector('.member-stats');
    expect(statsElement).toBeFalsy();
  });

  it('should display zero stats correctly', () => {
    componentRef.setInput('member', {
      ...mockParentMember,
      tasksCompleted: 0,
      totalTasks: 0,
      points: 0,
    });
    componentRef.setInput('showStats', true);
    fixture.detectChanges();

    const pointsElement = fixture.nativeElement.querySelector('.member-points');
    expect(pointsElement?.textContent).toContain('0 pts');

    const tasksElement = fixture.nativeElement.querySelector('.member-tasks');
    expect(tasksElement?.textContent).toContain('0/0 tasks');
  });

  it('should display default values for missing stats', () => {
    const memberWithoutStats: MemberCardData = {
      id: '3',
      name: 'Test User',
      role: 'child',
    };

    componentRef.setInput('member', memberWithoutStats);
    componentRef.setInput('showStats', true);
    fixture.detectChanges();

    const pointsElement = fixture.nativeElement.querySelector('.member-points');
    expect(pointsElement?.textContent).toContain('0 pts');

    const tasksElement = fixture.nativeElement.querySelector('.member-tasks');
    expect(tasksElement?.textContent).toContain('0/0 tasks');
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
