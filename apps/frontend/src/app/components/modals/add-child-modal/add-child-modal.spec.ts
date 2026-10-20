import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AddChildModal, AddChildData } from './add-child-modal';

function setDesktop(matches: boolean): void {
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    writable: true,
    value: () => ({ matches, addEventListener: vi.fn(), removeEventListener: vi.fn() }),
  });
}

describe('AddChildModal', () => {
  let component: AddChildModal;
  let fixture: ComponentFixture<AddChildModal>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AddChildModal],
    }).compileComponents();

    fixture = TestBed.createComponent(AddChildModal);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should have a form with required fields', () => {
    expect(component['form']).toBeTruthy();
    expect(component['form'].controls['name']).toBeTruthy();
    expect(component['form'].controls['age']).toBeTruthy();
    expect(component['form'].contains('avatar')).toBe(false);
  });

  it('starts with an empty, optional age (ST-1624)', () => {
    expect(component['form'].value.age).toBeNull();
    expect(component['form'].controls['age'].valid).toBe(true);
  });

  it('emits age null when a child is added without an age (ST-1624)', () => {
    let emittedData: AddChildData | undefined;
    component.childAdded.subscribe((data) => {
      emittedData = data;
    });

    component['form'].patchValue({ name: 'Emma' });
    component.onSubmit();

    expect(emittedData).toEqual({ name: 'Emma', age: null });
  });

  it('should validate age range (1-18)', () => {
    const ageControl = component['form'].controls['age'];

    ageControl.setValue(0);
    expect(ageControl.valid).toBe(false);

    ageControl.setValue(19);
    expect(ageControl.valid).toBe(false);

    ageControl.setValue(10);
    expect(ageControl.valid).toBe(true);
  });

  it('should emit childAdded event on valid form submission', () => {
    let emittedData: AddChildData | undefined;
    component.childAdded.subscribe((data) => {
      emittedData = data;
    });

    component['form'].patchValue({ name: 'Emma', age: 12 });
    component.onSubmit();

    expect(emittedData).toBeTruthy();
    expect(emittedData).toEqual({ name: 'Emma', age: 12 });
  });

  it('shows no avatar emoji field', () => {
    fixture.componentRef.setInput('open', true);
    fixture.detectChanges();
    expect(document.querySelector('#child-avatar')).toBeNull();
  });

  it('keeps the main button disabled on the phone while the form is empty (ST-1489)', () => {
    component['form'].patchValue({ name: '' });
    fixture.componentRef.setInput('open', true);
    fixture.detectChanges();
    const button: HTMLButtonElement = fixture.nativeElement.querySelector('button[type="submit"]');
    expect(button.disabled).toBe(true);
  });

  describe('on desktop (ST-1489 rule 4)', () => {
    const realMatchMedia = window.matchMedia;

    beforeEach(() => {
      setDesktop(true);
      fixture = TestBed.createComponent(AddChildModal);
      component = fixture.componentInstance;
      fixture.detectChanges();
    });
    afterEach(() => {
      Object.defineProperty(window, 'matchMedia', {
        configurable: true,
        writable: true,
        value: realMatchMedia,
      });
    });

    it('keeps the main button live while the form is empty (ST-1489 rule 4)', () => {
      component['form'].patchValue({ name: '' });
      fixture.componentRef.setInput('open', true);
      fixture.detectChanges();
      const button: HTMLButtonElement =
        fixture.nativeElement.querySelector('button[type="submit"]');
      expect(button.disabled).toBe(false);
    });

    it('marks the fields and emits nothing when pressed on an invalid form (ST-1489 rule 4)', () => {
      let emitted = false;
      component.childAdded.subscribe(() => (emitted = true));
      component['form'].patchValue({ name: '' });
      component.onSubmit();
      expect(emitted).toBe(false);
      expect(component['form'].controls['name'].touched).toBe(true);
    });
  });
});
