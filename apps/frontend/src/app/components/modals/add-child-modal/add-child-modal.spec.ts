import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AddChildModal, AddChildData } from './add-child-modal';

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
    expect(component['form'].controls['avatar']).toBeTruthy();
  });

  it('should have default age of 10 and avatar of 😊', () => {
    expect(component['form'].value.age).toBe(10);
    expect(component['form'].value.avatar).toBe('😊');
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

    component['form'].patchValue({ name: 'Emma', age: 12, avatar: '🎨' });
    component.onSubmit();

    expect(emittedData).toBeTruthy();
    expect(emittedData!.name).toBe('Emma');
    expect(emittedData!.age).toBe(12);
    expect(emittedData!.avatar).toBe('🎨');
  });
});
