import {
  Component,
  ChangeDetectionStrategy,
  signal,
  AfterViewInit,
  OnDestroy,
  output,
  ElementRef,
  viewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { BrowserMultiFormatReader, NotFoundException } from '@zxing/library';

/** Ask for the back camera; phones without one (and laptops) fall back to any camera */
const CAMERA_CONSTRAINTS: MediaStreamConstraints = {
  video: { facingMode: { ideal: 'environment' } },
};

interface FeaturePolicy {
  allowsFeature(feature: string): boolean;
}

/**
 * False when the page's Permissions-Policy header turns the camera off
 * (`camera=()`). The browser then refuses getUserMedia at once, without asking
 * the user, and no retry or setting on the phone can change that (ST-679).
 * Browsers without the policy API (Safari) report true; their refusal shows up
 * as a NotAllowedError instead.
 */
export function cameraAllowedByPolicy(doc: Document = document): boolean {
  const { permissionsPolicy, featurePolicy } = doc as Document & {
    permissionsPolicy?: FeaturePolicy;
    featurePolicy?: FeaturePolicy;
  };
  const policy = permissionsPolicy ?? featurePolicy;
  return policy ? policy.allowsFeature('camera') : true;
}

@Component({
  selector: 'app-qr-code-scanner',
  imports: [CommonModule],
  templateUrl: './qr-code-scanner.html',
  styleUrl: './qr-code-scanner.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class QrCodeScannerComponent implements AfterViewInit, OnDestroy {
  // Outputs
  readonly tokenScanned = output<string>();
  readonly scanCancelled = output<void>();

  // Video element reference. The element is always rendered (hidden until the
  // camera runs), so it exists when scanning starts.
  readonly video = viewChild<ElementRef<HTMLVideoElement>>('videoElement');

  // State
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly scanning = signal(false);
  protected readonly cameraPermissionDenied = signal(false);
  protected readonly noCameraAvailable = signal(false);
  /** The site itself does not allow the camera; only e-mail login works */
  protected readonly cameraBlocked = signal(false);
  /** "Tillat kameratilgang" was pressed and the camera was refused again */
  protected readonly stillDenied = signal(false);

  private codeReader: BrowserMultiFormatReader | null = null;
  private isScanning = false;
  /** Set on destroy; checked after every await so a closed scanner never starts the camera */
  private destroyed = false;

  async ngAfterViewInit(): Promise<void> {
    await this.initializeScanner();
  }

  ngOnDestroy(): void {
    this.destroyed = true;
    this.stopScanning();
  }

  /**
   * Initialize the QR code scanner
   */
  private async initializeScanner(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);

    try {
      // Check if getUserMedia is supported
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        this.noCameraAvailable.set(true);
        this.error.set(
          $localize`:@@qrCodeScanner.notSupported:Denne enheten gir ikke tilgang til kameraet.`,
        );
        this.loading.set(false);
        return;
      }

      if (!cameraAllowedByPolicy()) {
        this.cameraBlocked.set(true);
        this.error.set(
          $localize`:@@qrCodeScanner.blockedBySite:Kameraet er slått av for denne nettsiden.`,
        );
        this.loading.set(false);
        return;
      }

      // Ask for camera permission, then release the camera again so the reader
      // can open it (iOS does not share one camera between two streams)
      try {
        const stream = await navigator.mediaDevices.getUserMedia(CAMERA_CONSTRAINTS);
        stream.getTracks().forEach((track) => track.stop());
        if (this.destroyed) return;
      } catch (err) {
        const name = err instanceof DOMException ? err.name : '';
        if (name === 'NotFoundError' || name === 'OverconstrainedError') {
          this.noCameraAvailable.set(true);
          this.error.set($localize`:@@qrCodeScanner.noCamera:Fant ikke noe kamera på enheten.`);
        } else if (name === 'NotReadableError' || name === 'AbortError') {
          this.error.set(
            $localize`:@@qrCodeScanner.cameraBusy:Kameraet brukes av en annen app. Lukk den og prøv igjen.`,
          );
        } else {
          this.cameraPermissionDenied.set(true);
          this.error.set(
            $localize`:@@qrCodeScanner.permissionDenied:Du må tillate kameraet for å skanne QR-koder.`,
          );
        }
        this.loading.set(false);
        return;
      }

      // Initialize code reader
      this.codeReader = new BrowserMultiFormatReader();
      await this.startScanning();
    } catch (err) {
      console.error('Failed to initialize scanner:', err);
      this.error.set(
        $localize`:@@qrCodeScanner.initFailed:Kunne ikke starte kameraet. Prøv igjen.`,
      );
      this.loading.set(false);
    }
  }

  /**
   * Start scanning for QR codes
   */
  private async startScanning(): Promise<void> {
    if (!this.codeReader) return;

    const videoElement = this.video();
    if (!videoElement) return;

    try {
      this.isScanning = true;
      this.scanning.set(true);
      this.loading.set(false);

      // Continuous scanning with the back camera. Choosing the camera by
      // facingMode works on every platform; device labels are localized
      // ("Bakre kamera" on a Norwegian iPhone) and empty before permission.
      await this.codeReader.decodeFromConstraints(
        CAMERA_CONSTRAINTS,
        videoElement.nativeElement,
        (result, err) => {
          if (result) {
            // Successfully scanned a QR code
            const token = result.getText();
            this.tokenScanned.emit(token);
            this.stopScanning();
          } else if (err && !(err instanceof NotFoundException)) {
            // Log errors that aren't just "no QR code found"
            console.error('Scan error:', err);
          }
        },
      );
      // Closed while the camera was opening: release it again
      if (this.destroyed) this.stopScanning();
    } catch (err) {
      console.error('Failed to start scanning:', err);
      this.error.set(
        $localize`:@@qrCodeScanner.startFailed:Kunne ikke starte kameraet. Prøv igjen.`,
      );
      this.isScanning = false;
      this.scanning.set(false);
    }
  }

  /**
   * Stop scanning and release camera
   */
  private stopScanning(): void {
    if (this.codeReader) {
      this.codeReader.reset();
    }
    this.isScanning = false;
    this.scanning.set(false);
  }

  /**
   * Retry camera access
   */
  protected async retry(): Promise<void> {
    this.cameraPermissionDenied.set(false);
    this.noCameraAvailable.set(false);
    this.stillDenied.set(false);
    this.error.set(null);
    await this.initializeScanner();
  }

  /**
   * Cancel scanning
   */
  protected cancel(): void {
    this.stopScanning();
    this.scanCancelled.emit();
  }

  /**
   * Request camera permission again
   */
  protected async requestPermission(): Promise<void> {
    this.cameraPermissionDenied.set(false);
    this.stillDenied.set(false);
    this.error.set(null);
    await this.initializeScanner();
    // Refused again: say so, otherwise the screen only flashes (ST-679)
    if (this.cameraPermissionDenied()) this.stillDenied.set(true);
  }
}
