import { Component, signal, inject, ChangeDetectionStrategy } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { HouseholdService } from '../../services/household.service';

@Component({
  selector: 'app-household-create',
  imports: [ReactiveFormsModule],
  templateUrl: './household-create.html',
  styleUrl: './household-create.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HouseholdCreateComponent {
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private householdService = inject(HouseholdService);

  isLoading = signal(false);
  errorMessage = signal('');

  householdForm: FormGroup = this.fb.group({
    name: ['', [Validators.required, Validators.minLength(1), Validators.maxLength(100)]],
  });

  async onSubmit() {
    if (this.householdForm.invalid) return;

    this.isLoading.set(true);
    this.errorMessage.set('');

    try {
      const { name } = this.householdForm.value;
      const household = await this.householdService.createHousehold(name);

      // Store active household ID
      this.householdService.setActiveHousehold(household.id);

      // Redirect to dashboard (root for now)
      await this.router.navigate(['/']);
    } catch (error: any) {
      this.isLoading.set(false);

      // User-friendly error messages
      let message = 'Failed to create household. Please try again.';

      if (error?.status === 400) {
        message = 'Please check your household name.';
      } else if (error?.status === 401) {
        message = 'Session expired. Please log in again.';
        await this.router.navigate(['/login']);
        return;
      } else if (!navigator.onLine) {
        message = 'No internet connection. Please check your connection.';
      }

      this.errorMessage.set(message);
    }
  }
}
