import { ComponentFixture, TestBed } from '@angular/core/testing';
import { QuickAddModal, QuickAddTaskData } from './quick-add-modal';

describe('QuickAddModal', () => {
  let component: QuickAddModal;
  let fixture: ComponentFixture<QuickAddModal>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [QuickAddModal],
    }).compileComponents();

    fixture = TestBed.createComponent(QuickAddModal);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('children', []);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should have a form with required fields', () => {
    expect(component['form']).toBeTruthy();
    expect(component['form'].controls['name']).toBeTruthy();
    expect(component['form'].controls['assignedChildId']).toBeTruthy();
    expect(component['form'].controls['points']).toBeTruthy();
  });

  it('should have default points value of 5', () => {
    expect(component['form'].value.points).toBe(5);
  });

  it('should mark form as invalid when name is empty', () => {
    component['form'].patchValue({ name: '', assignedChildId: 'test-id', points: 5 });
    expect(component['form'].valid).toBe(false);
  });

  it('should mark form as valid with all required fields', () => {
    component['form'].patchValue({ name: 'Test Task', assignedChildId: 'test-id', points: 5 });
    expect(component['form'].valid).toBe(true);
  });

  it('should emit taskCreated event on valid form submission', () => {
    let emittedData: QuickAddTaskData | undefined;
    component.taskCreated.subscribe((data) => {
      emittedData = data;
    });

    component['form'].patchValue({ name: 'Test Task', assignedChildId: 'test-id', points: 10 });
    component.onSubmit();

    expect(emittedData).toBeTruthy();
    expect(emittedData!.name).toBe('Test Task');
    expect(emittedData!.assignedChildId).toBe('test-id');
    expect(emittedData!.points).toBe(10);
  });
});
