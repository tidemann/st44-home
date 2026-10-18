import { Component, input, output, signal, inject, ChangeDetectionStrategy } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Modal } from '../modal/modal';

/**
 * Data structure for add child submission
 */
export interface AddChildData {
  name: string;
  age: number;
  avatar: string;
}

/**
 * Add Child Modal
 *
 * Allows parents to add children to the household:
 * - Child name (required)
 * - Age (required, 1-18)
 * - Avatar emoji (optional, default: 😊)
 *
 * Emits child data for parent component to handle API call.
 */
@Component({
  selector: 'app-add-child-modal',
  imports: [Modal, ReactiveFormsModule],
  templateUrl: './add-child-modal.html',
  styleUrl: './add-child-modal.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AddChildModal {
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
    age: [10, [Validators.required, Validators.min(1), Validators.max(18)]],
    avatar: ['😊'],
  });

  /**
   * Submission loading state
   */
  protected readonly submitting = signal(false);

  /**
   * Available avatar emojis
   */
  protected readonly avatarOptions: { value: string; label: string }[] = [
    { value: '😊', label: '😊 Happy' },
    { value: '🎮', label: '🎮 Gamer' },
    { value: '⚽', label: '⚽ Sports' },
    { value: '📚', label: '📚 Bookworm' },
    { value: '🎨', label: '🎨 Artist' },
    { value: '🎵', label: '🎵 Music' },
    { value: '🚀', label: '🚀 Space' },
    { value: '🐶', label: '🐶 Dog Lover' },
    { value: '🐱', label: '🐱 Cat Lover' },
    { value: '🌟', label: '🌟 Star' },
  ];

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
      age: formValue.age!,
      avatar: formValue.avatar!,
    });

    // Reset form
    this.form.reset({ age: 10, avatar: '😊' });
  }

  /**
   * Handle modal closeRequested
   */
  onClose(): void {
    this.form.reset({ age: 10, avatar: '😊' });
    this.closeRequested.emit();
  }

  /**
   * Handle cancel button click
   */
  onCancel(): void {
    this.onClose();
  }
}
