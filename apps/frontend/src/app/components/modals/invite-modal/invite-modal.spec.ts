import { ComponentFixture, TestBed } from '@angular/core/testing';
import { InviteModal, InviteMemberData } from './invite-modal';

function setDesktop(matches: boolean): void {
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    value: () => ({ matches, addEventListener: vi.fn(), removeEventListener: vi.fn() }),
  });
}

describe('InviteModal', () => {
  let component: InviteModal;
  let fixture: ComponentFixture<InviteModal>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [InviteModal],
    }).compileComponents();

    fixture = TestBed.createComponent(InviteModal);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should have a form with required fields', () => {
    expect(component['form']).toBeTruthy();
    expect(component['form'].controls['email']).toBeTruthy();
    expect(component['form'].controls['role']).toBeTruthy();
    expect(component['form'].controls['message']).toBeTruthy();
  });

  it('should validate email format', () => {
    const emailControl = component['form'].controls['email'];
    emailControl.setValue('invalid-email');
    expect(emailControl.valid).toBe(false);

    emailControl.setValue('valid@example.com');
    expect(emailControl.valid).toBe(true);
  });

  it('should emit inviteSent event on valid form submission', () => {
    let emittedData: InviteMemberData | undefined;
    component.inviteSent.subscribe((data) => {
      emittedData = data;
    });

    component['form'].patchValue({
      email: 'test@example.com',
      role: 'parent',
      message: 'Welcome!',
    });
    component.onSubmit();

    expect(emittedData).toBeTruthy();
    expect(emittedData!.email).toBe('test@example.com');
    expect(emittedData!.role).toBe('parent');
    expect(emittedData!.message).toBe('Welcome!');
  });

  it('should show the role options and close label in Norwegian', () => {
    fixture.componentRef.setInput('open', true);
    fixture.detectChanges();
    const el: HTMLElement = fixture.nativeElement;

    const options = Array.from(el.querySelectorAll('#invite-role option')).map((o) =>
      o.textContent?.trim(),
    );
    expect(options).toEqual(['Forelder (admin)', 'Voksen']);
    expect(el.querySelector('.modal-close')?.getAttribute('aria-label')).toBe('Lukk');
  });

  it('keeps the main button disabled on the phone while the form is empty (ST-1489)', () => {
    component['form'].patchValue({ email: '' });
    fixture.componentRef.setInput('open', true);
    fixture.detectChanges();
    const button: HTMLButtonElement = fixture.nativeElement.querySelector('button[type="submit"]');
    expect(button.disabled).toBe(true);
  });

  describe('on desktop (ST-1489 rule 4)', () => {
    const realMatchMedia = window.matchMedia;

    beforeEach(() => {
      setDesktop(true);
      fixture = TestBed.createComponent(InviteModal);
      component = fixture.componentInstance;
      fixture.detectChanges();
    });
    afterEach(() => {
      Object.defineProperty(window, 'matchMedia', { configurable: true, value: realMatchMedia });
    });

    it('keeps the main button live while the form is empty (ST-1489 rule 4)', () => {
      component['form'].patchValue({ email: '' });
      fixture.componentRef.setInput('open', true);
      fixture.detectChanges();
      const button: HTMLButtonElement =
        fixture.nativeElement.querySelector('button[type="submit"]');
      expect(button.disabled).toBe(false);
    });

    it('marks the fields and emits nothing when pressed on an invalid form (ST-1489 rule 4)', () => {
      let emitted = false;
      component.inviteSent.subscribe(() => (emitted = true));
      component['form'].patchValue({ email: '' });
      component.onSubmit();
      expect(emitted).toBe(false);
      expect(component['form'].controls['email'].touched).toBe(true);
    });
  });
});
