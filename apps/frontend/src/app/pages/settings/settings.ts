import { Component, ChangeDetectionStrategy, signal, inject, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { Router } from '@angular/router';
import { UserService, type UserProfile } from '../../services/user.service';
import { AuthService } from '../../services/auth.service';

/**
 * Settings Screen
 *
 * Allows users to view and edit their profile:
 * - Display name
 * - Email address
 * - Password change
 *
 * Design matches the "Diddit!" playful aesthetic from UX redesign.
 * Navigation is handled by the parent MainLayout component.
 */
@Component({
  selector: 'app-settings',
  imports: [FormsModule, DatePipe],
  templateUrl: './settings.html',
  styleUrl: './settings.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Settings implements OnInit {
  private readonly userService = inject(UserService);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  // State signals
  protected readonly loading = signal(true);
  protected readonly saving = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly successMessage = signal<string | null>(null);

  // Profile data
  protected readonly profile = signal<UserProfile | null>(null);

  // Form fields
  protected firstName = '';
  protected lastName = '';
  protected email = '';
  protected currentPassword = '';
  protected newPassword = '';
  protected confirmPassword = '';

  // Password section toggle
  protected readonly showPasswordSection = signal(false);

  async ngOnInit(): Promise<void> {
    await this.loadProfile();
  }

  /**
   * Load user profile data
   */
  protected async loadProfile(): Promise<void> {
    try {
      this.loading.set(true);
      this.error.set(null);

      const profile = await this.userService.getProfile();
      this.profile.set(profile);

      // Initialize form fields
      this.firstName = profile.firstName ?? '';
      this.lastName = profile.lastName ?? '';
      this.email = profile.email;
    } catch (err) {
      console.error('Failed to load profile:', err);
      this.error.set('Failed to load profile. Please try again.');
    } finally {
      this.loading.set(false);
    }
  }

  /**
   * Save profile changes
   */
  protected async saveProfile(): Promise<void> {
    const currentProfile = this.profile();
    if (!currentProfile) return;

    try {
      this.saving.set(true);
      this.error.set(null);
      this.successMessage.set(null);

      // Build update request with only changed fields
      const updates: { firstName?: string; lastName?: string; email?: string; password?: string } =
        {};

      if (this.firstName !== (currentProfile.firstName ?? '')) {
        updates.firstName = this.firstName;
      }

      if (this.lastName !== (currentProfile.lastName ?? '')) {
        updates.lastName = this.lastName;
      }

      if (this.email !== currentProfile.email) {
        updates.email = this.email;
      }

      // Validate password if changing
      if (this.showPasswordSection() && this.newPassword) {
        if (this.newPassword !== this.confirmPassword) {
          this.error.set('New passwords do not match');
          return;
        }

        if (this.newPassword.length < 8) {
          this.error.set('Password must be at least 8 characters');
          return;
        }

        if (!/[A-Z]/.test(this.newPassword)) {
          this.error.set('Password must contain at least one uppercase letter');
          return;
        }

        if (!/[a-z]/.test(this.newPassword)) {
          this.error.set('Password must contain at least one lowercase letter');
          return;
        }

        if (!/\d/.test(this.newPassword)) {
          this.error.set('Password must contain at least one number');
          return;
        }

        updates.password = this.newPassword;
      }

      // Check if there are any changes
      if (Object.keys(updates).length === 0) {
        this.error.set('No changes to save');
        return;
      }

      const updatedProfile = await this.userService.updateProfile(updates);
      this.profile.set(updatedProfile);
      this.firstName = updatedProfile.firstName ?? '';
      this.lastName = updatedProfile.lastName ?? '';
      this.email = updatedProfile.email;

      // Clear password fields
      this.currentPassword = '';
      this.newPassword = '';
      this.confirmPassword = '';
      this.showPasswordSection.set(false);

      this.successMessage.set('Profile updated successfully!');
    } catch (err: unknown) {
      console.error('Failed to save profile:', err);
      const errorMessage =
        err instanceof Error && 'status' in err && (err as { status: number }).status === 409
          ? 'Email is already in use'
          : 'Failed to save profile. Please try again.';
      this.error.set(errorMessage);
    } finally {
      this.saving.set(false);
    }
  }

  /**
   * Toggle password change section
   */
  protected togglePasswordSection(): void {
    this.showPasswordSection.update((v) => !v);
    if (!this.showPasswordSection()) {
      this.currentPassword = '';
      this.newPassword = '';
      this.confirmPassword = '';
    }
  }

  /**
   * Logout and redirect to login
   */
  protected logout(): void {
    this.authService.logout();
    void this.router.navigate(['/login']);
  }

  /**
   * Dismiss success message
   */
  protected dismissSuccess(): void {
    this.successMessage.set(null);
  }

  /**
   * Dismiss error message
   */
  protected dismissError(): void {
    this.error.set(null);
  }
}
