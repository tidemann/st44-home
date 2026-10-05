import {
  Component,
  ChangeDetectionStrategy,
  signal,
  input,
  inject,
  OnInit,
  ElementRef,
  viewChild,
  effect,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import QRCode from 'qrcode';
import { QrAuthService } from '../../services/qr-auth.service';

@Component({
  selector: 'app-qr-code-display',
  imports: [CommonModule],
  templateUrl: './qr-code-display.html',
  styleUrl: './qr-code-display.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class QrCodeDisplayComponent implements OnInit {
  private readonly qrAuthService = inject(QrAuthService);

  // Inputs
  readonly childId = input.required<string>();
  readonly childName = input<string>('');

  // Canvas reference
  readonly canvas = viewChild<ElementRef<HTMLCanvasElement>>('qrCanvas');

  // State
  protected readonly loading = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly qrToken = signal<string | null>(null);
  protected readonly expiresAt = signal<string | null>(null);

  constructor() {
    // Generate QR code when token changes
    effect(() => {
      const token = this.qrToken();
      const canvasRef = this.canvas();

      if (token && canvasRef) {
        this.generateQrCode(token, canvasRef.nativeElement);
      }
    });
  }

  async ngOnInit(): Promise<void> {
    await this.loadQrToken();
  }

  /**
   * Load or generate QR token for the child
   */
  protected async loadQrToken(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);

    try {
      const response = await new Promise<{ token: string; expiresAt: string }>(
        (resolve, reject) => {
          this.qrAuthService.getQrToken(this.childId()).subscribe({
            next: resolve,
            error: reject,
          });
        },
      );

      this.qrToken.set(response.token);
      this.expiresAt.set(response.expiresAt);
    } catch {
      // If token doesn't exist, generate a new one
      try {
        const response = await new Promise<{ token: string; expiresAt: string }>(
          (resolve, reject) => {
            this.qrAuthService.generateQrToken(this.childId()).subscribe({
              next: resolve,
              error: reject,
            });
          },
        );

        this.qrToken.set(response.token);
        this.expiresAt.set(response.expiresAt);
      } catch (genErr) {
        console.error('Failed to generate QR token:', genErr);
        this.error.set(
          $localize`:@@qrCodeDisplay.generateFailed:Kunne ikke lage QR-koden. Prøv igjen.`,
        );
      }
    } finally {
      this.loading.set(false);
    }
  }

  /**
   * Generate QR code on canvas
   */
  private async generateQrCode(token: string, canvas: HTMLCanvasElement): Promise<void> {
    try {
      await QRCode.toCanvas(canvas, token, {
        width: 300,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF',
        },
      });
    } catch (err) {
      console.error('Failed to generate QR code:', err);
      this.error.set($localize`:@@qrCodeDisplay.drawFailed:Kunne ikke vise QR-koden.`);
    }
  }

  /**
   * Regenerate QR token
   */
  protected async regenerate(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);

    try {
      const response = await new Promise<{ token: string; expiresAt: string }>(
        (resolve, reject) => {
          this.qrAuthService.regenerateQrToken(this.childId()).subscribe({
            next: resolve,
            error: reject,
          });
        },
      );

      this.qrToken.set(response.token);
      this.expiresAt.set(response.expiresAt);
    } catch (err) {
      console.error('Failed to regenerate QR token:', err);
      this.error.set(
        $localize`:@@qrCodeDisplay.regenerateFailed:Kunne ikke lage ny QR-kode. Prøv igjen.`,
      );
    } finally {
      this.loading.set(false);
    }
  }

  /**
   * Download QR code as PNG image
   */
  protected async download(): Promise<void> {
    const canvasRef = this.canvas();
    if (!canvasRef) return;

    try {
      const canvas = canvasRef.nativeElement;
      const url = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      const childName = this.childName() || 'child';
      link.download = `qr-code-${childName.replace(/\s+/g, '-').toLowerCase()}.png`;
      link.href = url;
      link.click();
    } catch (err) {
      console.error('Failed to download QR code:', err);
      this.error.set($localize`:@@qrCodeDisplay.downloadFailed:Kunne ikke laste ned QR-koden.`);
    }
  }

  /**
   * Print QR code
   */
  protected print(): void {
    const canvasRef = this.canvas();
    if (!canvasRef) return;

    try {
      const canvas = canvasRef.nativeElement;
      const url = canvas.toDataURL('image/png');
      const printWindow = window.open('', '_blank');

      if (!printWindow) {
        this.error.set(
          $localize`:@@qrCodeDisplay.printBlocked:Kunne ikke åpne utskriften. Tillat popup-vinduer.`,
        );
        return;
      }

      const childName = this.childName() || $localize`:@@qrCodeDisplay.childFallback:barnet`;
      const printTitle = $localize`:@@qrCodeDisplay.printTitle:QR-kode for innlogging – ${childName}:childName:`;
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>QR-kode – ${childName}</title>
            <style>
              body {
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                min-height: 100vh;
                margin: 0;
                font-family: system-ui, -apple-system, sans-serif;
              }
              h1 {
                margin-bottom: 1rem;
                color: #333;
              }
              img {
                border: 2px solid #ddd;
                border-radius: 8px;
                padding: 1rem;
              }
              @media print {
                body {
                  background: white;
                }
              }
            </style>
          </head>
          <body>
            <h1>${printTitle}</h1>
            <img src="${url}" alt="${printTitle}" />
            <script>
              window.onload = () => {
                window.print();
                window.onafterprint = () => window.close();
              };
            </script>
          </body>
        </html>
      `);
      printWindow.document.close();
    } catch (err) {
      console.error('Failed to print QR code:', err);
      this.error.set($localize`:@@qrCodeDisplay.printFailed:Kunne ikke skrive ut QR-koden.`);
    }
  }

  /**
   * Get formatted expiration date
   */
  protected getExpirationText(): string {
    const expiresAt = this.expiresAt();
    if (!expiresAt) return '';

    const date = new Date(expiresAt);
    const now = new Date();
    const diffMs = date.getTime() - now.getTime();
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays <= 0) {
      return $localize`:@@qrCodeDisplay.expired:Utløpt`;
    } else if (diffDays === 1) {
      return $localize`:@@qrCodeDisplay.expiresTomorrow:Utløper i morgen`;
    } else if (diffDays <= 7) {
      return $localize`:@@qrCodeDisplay.expiresInDays:Utløper om ${diffDays}:days: dager`;
    } else {
      return $localize`:@@qrCodeDisplay.expiresOn:Utløper ${date.toLocaleDateString('nb-NO')}:date:`;
    }
  }
}
