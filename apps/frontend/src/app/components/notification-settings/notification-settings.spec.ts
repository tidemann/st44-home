import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { NotificationSettings } from './notification-settings';
import { PushNotificationService, type PushState } from '../../services/push-notification.service';
import { PwaService } from '../../services/pwa.service';

describe('NotificationSettings', () => {
  let fixture: ComponentFixture<NotificationSettings>;
  const state = signal<PushState>('checking');
  const push = {
    state,
    busy: signal(false),
    refresh: vi.fn().mockResolvedValue('off'),
    enable: vi.fn().mockResolvedValue('on'),
    disable: vi.fn().mockResolvedValue('off'),
    sendTest: vi.fn().mockResolvedValue(1),
  };
  const pwa = { ios: false };

  beforeEach(async () => {
    state.set('checking');
    pwa.ios = false;
    Object.values(push).forEach((value) => {
      if (typeof value === 'function' && 'mockClear' in value) value.mockClear();
    });
    await TestBed.configureTestingModule({
      imports: [NotificationSettings],
      providers: [
        { provide: PushNotificationService, useValue: push },
        { provide: PwaService, useValue: pwa },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(NotificationSettings);
  });

  function render(pushState: PushState): HTMLElement {
    state.set(pushState);
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  }

  function button(el: HTMLElement, label: string): HTMLButtonElement {
    const match = Array.from(el.querySelectorAll('button')).find((b) =>
      b.textContent?.includes(label),
    );
    if (!match) throw new Error(`No button "${label}"`);
    return match;
  }

  it('checks the state on open', () => {
    render('checking');
    expect(push.refresh).toHaveBeenCalledTimes(1);
  });

  it('turns push on from the off state', () => {
    const el = render('off');
    button(el, 'Slå på varsler').click();
    expect(push.enable).toHaveBeenCalled();
  });

  it('shows on with a tick and the words, and can turn off and test', async () => {
    const el = render('on');
    expect(el.textContent).toContain('✓');
    expect(el.textContent).toContain('Varsler er på');
    button(el, 'Send et testvarsel').click();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(push.sendTest).toHaveBeenCalled();
    expect(el.textContent).toContain('Testvarselet er sendt');
    button(el, 'Slå av').click();
    expect(push.disable).toHaveBeenCalled();
  });

  it('explains the blocked state and how to undo it (sketch 08)', () => {
    const el = render('blocked');
    expect(el.querySelector('.alert-warning')?.textContent).toContain('Varsler er blokkert');
    expect(el.textContent).toContain('ikke beskjed når barna er ferdige');
    expect(el.textContent).toContain('hengelåsen');
    button(el, 'Sjekk igjen').click();
    expect(push.refresh).toHaveBeenCalledTimes(2);
  });

  it('gives iPhone steps when blocked on iOS', () => {
    pwa.ios = true;
    fixture = TestBed.createComponent(NotificationSettings);
    const el = render('blocked');
    expect(el.textContent).toContain('Tillat varslinger');
  });

  it('uses child wording for children', () => {
    fixture.componentRef.setInput('audience', 'child');
    const el = render('blocked');
    expect(el.textContent).toContain('ingen påminnelser om oppgavene dine');
  });

  it('hides the compact card once push is on, or when there is nothing to do', () => {
    fixture.componentRef.setInput('compact', true);
    expect(render('on').querySelector('section')).toBeNull();
    expect(render('unsupported').querySelector('section')).toBeNull();
    expect(render('off').querySelector('section')).not.toBeNull();
    expect(render('blocked').querySelector('section')).not.toBeNull();
  });

  it('does not ask the browser when the state is forced (Storybook)', () => {
    fixture.componentRef.setInput('state', 'blocked');
    fixture.detectChanges();
    expect(push.refresh).not.toHaveBeenCalled();
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('blokkert');
  });
});
