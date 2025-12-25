import { ComponentFixture, TestBed } from '@angular/core/testing';
import { InviteModal, InviteMemberData } from './invite-modal';

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
});
