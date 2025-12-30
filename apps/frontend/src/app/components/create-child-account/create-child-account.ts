import {
  Component,
  signal,
  computed,
  input,
  output,
  inject,
  ChangeDetectionStrategy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import type { Child } from '@st44/types';
import { ChildrenService } from '../../services/children.service';
import {
  passwordStrengthValidator,
  passwordMatchValidator,
  getPasswordStrength,
} from '../../utils/password-validation.utils';

@Component({
  selector: 'app-create-child-account',
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './create-child-account.html',
  styleUrl: './create-child-account.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CreateChildAccountComponent {
  private fb = inject(FormBuilder);
  private childrenService = inject(ChildrenService);

  // Inputs
  readonly child = input.required<Child>();
  readonly householdId = input.required<string>();

  // Outputs
  readonly accountCreated = output<void>();
  readonly cancelled = output<void>();

  // State
  protected readonly isSubmitting = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly successMessage = signal<string | null>(null);
  protected readonly showPassword = signal(false);

  // Form
  protected readonly form = this.fb.group(
    {
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(8), passwordStrengthValidator]],
      confirmPassword: ['', [Validators.required]],
    },
    { validators: passwordMatchValidator },
  );

  // Computed
  protected get emailControl() {
    return this.form.get('email')!;
  }

  protected get passwordControl() {
    return this.form.get('password')!;
  }

  protected get confirmPasswordControl() {
    return this.form.get('confirmPassword')!;
  }

  protected passwordStrength = computed(() => {
    const password = this.passwordControl.value || '';
    const strength = getPasswordStrength(password);
    return {
      strength,
      class: strength,
      label: strength,
    };
  });

  protected togglePasswordVisibility(): void {
    this.showPassword.update((v) => !v);
  }

  protected async onSubmit(): Promise<void> {
    if (this.form.invalid) {
      this.errorMessage.set('Please fill all required fields correctly');
      return;
    }

    this.isSubmitting.set(true);
    this.errorMessage.set(null);
    this.successMessage.set(null);

    try {
      const { email, password } = this.form.value;
      await this.childrenService.createChildAccount(
        this.householdId(),
        this.child().id,
        email!,
        password!,
      );

      this.successMessage.set(`Account created successfully for ${this.child().name}`);

      // Emit success after a short delay to show message
      setTimeout(() => {
        this.accountCreated.emit();
      }, 1500);
    } catch (error: unknown) {
      const err = error as { error?: { error?: string; message?: string } };
      const message = err.error?.error || err.error?.message || 'Failed to create account';
      this.errorMessage.set(message);
    } finally {
      this.isSubmitting.set(false);
    }
  }

  protected onCancel(): void {
    this.cancelled.emit();
  }
}
