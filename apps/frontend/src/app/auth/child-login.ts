import { Component, signal, inject, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormGroup, FormControl, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { TopTabs } from '../components/navigation/top-tabs/top-tabs';
import { DidditMark } from '../components/diddit-mark/diddit-mark';
import { QrCodeScannerComponent } from '../components/qr-code-scanner/qr-code-scanner';
import { AuthService } from '../services/auth.service';
import { lastValueFrom } from 'rxjs';

/** ST-1999: QR first, e-mail second (Stig, option A on ST-1892) */
type ChildLoginMode = 'choices' | 'form' | 'scan';

@Component({
  selector: 'app-child-login',
  templateUrl: './child-login.html',
  styleUrl: './child-login.css',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterLink,
    TopTabs,
    DidditMark,
    QrCodeScannerComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChildLoginComponent {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  protected mode = signal<ChildLoginMode>('choices');

  protected chooseScan(): void {
    this.mode.set('scan');
  }

  protected chooseEmail(): void {
    this.mode.set('form');
  }

  protected back(): void {
    this.mode.set('choices');
  }

  protected onQrCodeScanned(_token: string): void {
    this.router.navigate(['/my-tasks']);
  }

  protected showPassword = signal(false);
  protected isLoading = signal(false);
  protected errorMessage = signal<string | null>(null);

  protected loginForm = new FormGroup({
    email: new FormControl('', [Validators.required, Validators.email]),
    password: new FormControl('', [Validators.required]),
  });

  protected get emailControl() {
    return this.loginForm.get('email')!;
  }

  protected get passwordControl() {
    return this.loginForm.get('password')!;
  }

  protected togglePasswordVisibility(): void {
    this.showPassword.update((v) => !v);
  }

  protected async onSubmit(): Promise<void> {
    if (this.isLoading()) return;

    // Validate on press: the button is never a greyed-out dead end (guide, rule 6)
    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set(null);

    try {
      const { email, password } = this.loginForm.value;
      await lastValueFrom(this.authService.login(email!, password!, false));

      // Success - navigate to child dashboard
      this.router.navigate(['/my-tasks']);
    } catch (error: unknown) {
      // Child-friendly error message
      this.errorMessage.set(
        $localize`:@@childLogin.loginFailed:Oops! Sjekk e-posten og passordet ditt og prøv igjen.`,
      );
      console.error('Login failed:', error);
    } finally {
      this.isLoading.set(false);
    }
  }
}
