import { ComponentFixture, TestBed } from '@angular/core/testing';
import { EditTaskModal, EditTaskData } from './edit-task-modal';

describe('EditTaskModal', () => {
  let component: EditTaskModal;
  let fixture: ComponentFixture<EditTaskModal>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EditTaskModal],
    }).compileComponents();

    fixture = TestBed.createComponent(EditTaskModal);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should have a form with required fields', () => {
    expect(component['form']).toBeTruthy();
    expect(component['form'].controls['name']).toBeTruthy();
    expect(component['form'].controls['points']).toBeTruthy();
    expect(component['form'].controls['ruleType']).toBeTruthy();
  });

  it('should emit taskUpdated event on valid form submission', () => {
    let emittedData: EditTaskData | undefined;
    component.taskUpdated.subscribe((data) => {
      emittedData = data;
    });

    component['form'].patchValue({ name: 'Updated Task', points: 15, ruleType: 'daily' });
    component.onSubmit();

    expect(emittedData).toBeTruthy();
    expect(emittedData!.name).toBe('Updated Task');
    expect(emittedData!.points).toBe(15);
    expect(emittedData!.ruleType).toBe('daily');
  });

  it('should show delete confirmation when delete is clicked', () => {
    expect(component['showDeleteConfirm']()).toBe(false);
    component.onDeleteClick();
    expect(component['showDeleteConfirm']()).toBe(true);
  });

  it('should emit taskDeleted event when delete is confirmed', () => {
    let deleteEmitted = false;
    component.taskDeleted.subscribe(() => {
      deleteEmitted = true;
    });

    component.onDeleteClick();
    component.onConfirmDelete();

    expect(deleteEmitted).toBe(true);
  });
});
