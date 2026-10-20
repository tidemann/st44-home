import { Component, input, output, signal, inject, ChangeDetectionStrategy } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Modal } from '../modal/modal';
import { isDesktopSignal } from '../../../utils/desktop-query';

/**
 * Data structure for add child submission
 */
export interface AddChildData {
  name: string;
  age: number | null;
}

/**
 * Add Child Modal
 *
 * Allows parents to add children to the household:
 * - Child name (required)
 * - Age (optional, 1-18)
 *
 * Emits child data for parent component to handle API call.
 */
@Component({
  selector: 'app-add-child-modal',
  imports: [Modal, ReactiveFormsModule],
  templateUrl: './add-child-modal.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AddChildModal {
  /** Popup rule 4 is desktop-only: on the phone the main action still waits for a valid form */
  protected readonly desktop = isDesktopSignal();
  /**
   * Whether the modal is open
   */
  open = input<boolean>(false);

  /**
   * Event emitted when modal should closeModal
   */
  closeRequested = output<void>();

  /**
   * Event emitted when child is added
   */
  childAdded = output<AddChildData>();

  /**
   * Form builder
   */
  private readonly fb = inject(FormBuilder);

  /**
   * Form group for add child
   */
  protected readonly form = this.fb.group({
    name: ['', [Validators.required, Validators.minLength(1), Validators.maxLength(255)]],
    age: [null as number | null, [Validators.min(1), Validators.max(18)]],
  });

  /**
   * Submission loading state
   */
  protected readonly submitting = signal(false);

  /**
   * Handle form submission
   */
  onSubmit(): void {
    if (this.submitting()) {
      return;
    }

    // ST-1430 rule 4: the main action is never pale — the form is checked when you
    // press it, and the error shows under the field.
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const formValue = this.form.value;

    // Emit child data
    this.childAdded.emit({
      name: formValue.name!.trim(),
      age: formValue.age ?? null,
    });

    // Reset form
    this.form.reset({ age: null });
  }

  /**
   * Handle modal closeRequested
   */
  onClose(): void {
    this.form.reset({ age: null });
    this.closeRequested.emit();
  }

  /**
   * Handle cancel button click
   */
  onCancel(): void {
    this.onClose();
  }
}
