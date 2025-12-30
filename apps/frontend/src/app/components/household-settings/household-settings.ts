import {
  Component,
  signal,
  computed,
  inject,
  OnInit,
  ChangeDetectionStrategy,
} from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { DatePipe } from '@angular/common';
import {
  HouseholdService,
  HouseholdListItem,
  HouseholdMemberResponse,
} from '../../services/household.service';
import { AuthService } from '../../services/auth.service';
import { ChildrenManagementComponent } from '../children-management/children-management';
import { InviteUserComponent } from '../invite-user/invite-user';
import { InvitationsSentListComponent } from '../invitations-sent-list/invitations-sent-list';

@Component({
  selector: 'app-household-settings',
  imports: [
    ReactiveFormsModule,
    DatePipe,
    ChildrenManagementComponent,
    InviteUserComponent,
    InvitationsSentListComponent,
  ],
  templateUrl: './household-settings.html',
  styleUrl: './household-settings.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HouseholdSettingsComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly householdService = inject(HouseholdService);
  private readonly authService = inject(AuthService);

  household = signal<HouseholdListItem | null>(null);
  members = signal<HouseholdMemberResponse[]>([]);
  currentUserRole = signal<'admin' | 'parent' | 'child' | null>(null);
  isLoading = signal(false);
  isSaving = signal(false);
  errorMessage = signal('');
  successMessage = signal('');

  // Admin role has household admin privileges
  isAdmin = computed(() => this.currentUserRole() === 'admin');

  householdForm: FormGroup = this.fb.group({
    name: ['', [Validators.required, Validators.minLength(1), Validators.maxLength(100)]],
  });

  async ngOnInit() {
    await this.loadHouseholdData();
  }

  private async loadHouseholdData() {
    this.isLoading.set(true);
    this.errorMessage.set('');

    try {
      const householdId = this.householdService.getActiveHouseholdId();
      if (!householdId) {
        await this.router.navigate(['/household/create']);
        return;
      }

      const household = await this.householdService.getHousehold(householdId);
      this.household.set(household);
      this.householdForm.patchValue({ name: household.name });

      // Load members
      const members = await this.householdService.getHouseholdMembers(householdId);
      this.members.set(members);

      // Determine current user role
      const currentUserId = this.getCurrentUserId();
      const currentMember = members.find((m) => m.userId === currentUserId);
      this.currentUserRole.set(currentMember?.role || null);

      // Disable form if not admin
      if (!this.isAdmin()) {
        this.householdForm.disable();
      }
    } catch (error: unknown) {
      const httpError = error as { status?: number };
      let message = 'Failed to load household data. Please try again.';

      if (httpError?.status === 401) {
        message = 'Session expired. Please log in again.';
        await this.router.navigate(['/login']);
        return;
      } else if (httpError?.status === 404) {
        message = 'Household not found.';
        await this.router.navigate(['/']);
        return;
      }

      this.errorMessage.set(message);
    } finally {
      this.isLoading.set(false);
    }
  }

  async onSubmit() {
    if (this.householdForm.invalid || !this.isAdmin()) return;

    const household = this.household();
    if (!household) return;

    this.isSaving.set(true);
    this.errorMessage.set('');
    this.successMessage.set('');

    try {
      const { name } = this.householdForm.value;
      await this.householdService.updateHousehold(household.id, name);

      this.household.set({ ...household, name });
      this.successMessage.set('Household updated successfully!');

      // Clear success message after 3 seconds
      setTimeout(() => this.successMessage.set(''), 3000);
    } catch (error: unknown) {
      const httpError = error as { status?: number };
      let message = 'Failed to update household. Please try again.';

      if (httpError?.status === 400) {
        message = 'Please check your household name.';
      } else if (httpError?.status === 401) {
        message = 'Session expired. Please log in again.';
        await this.router.navigate(['/login']);
        return;
      } else if (httpError?.status === 403) {
        message = 'You do not have permission to edit this household.';
      }

      this.errorMessage.set(message);
    } finally {
      this.isSaving.set(false);
    }
  }

  private getCurrentUserId(): string {
    return this.authService.getCurrentUserId() ?? '';
  }

  async onInvitationSent() {
    // Refresh members list
    const householdId = this.household()?.id;
    if (householdId) {
      // Note: New member won't appear until they accept, but refresh for consistency
      await this.loadHouseholdData();
    }
  }
}
