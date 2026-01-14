import {
  Component,
  ChangeDetectionStrategy,
  signal,
  OnInit,
  OnDestroy,
  output,
  ElementRef,
  viewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { BrowserMultiFormatReader, NotFoundException } from '@zxing/library';

@Component({
  selector: 'app-qr-code-scanner',
  imports: [CommonModule],
  templateUrl: './qr-code-scanner.html',
  styleUrl: './qr-code-scanner.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class QrCodeScannerComponent implements OnInit, OnDestroy {
  // Outputs
  readonly tokenScanned = output<string>();
  readonly scanCancelled = output<void>();

  // Video element reference
  readonly video = viewChild<ElementRef<HTMLVideoElement>>('videoElement');

  // State
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly scanning = signal(false);
  protected readonly cameraPermissionDenied = signal(false);
  protected readonly noCameraAvailable = signal(false);

  private codeReader: BrowserMultiFormatReader | null = null;
  private isScanning = false;

  async ngOnInit(): Promise<void> {
    await this.initializeScanner();
  }

  ngOnDestroy(): void {
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
        this.error.set('Camera access is not supported on this device.');
        this.loading.set(false);
        return;
      }

      // Request camera permission
      try {
        await navigator.mediaDevices.getUserMedia({ video: true });
      } catch {
        this.cameraPermissionDenied.set(true);
        this.error.set('Camera permission denied. Please allow camera access to scan QR codes.');
        this.loading.set(false);
        return;
      }

      // Initialize code reader
      this.codeReader = new BrowserMultiFormatReader();
      await this.startScanning();
    } catch (err) {
      console.error('Failed to initialize scanner:', err);
      this.error.set('Failed to initialize camera. Please try again.');
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

      // Get available video devices
      const videoDevices = await this.codeReader.listVideoInputDevices();

      if (videoDevices.length === 0) {
        this.noCameraAvailable.set(true);
        this.error.set('No camera found on this device.');
        return;
      }

      // Prefer back camera on mobile devices
      const backCamera = videoDevices.find((device) => device.label.toLowerCase().includes('back'));
      const deviceId = backCamera?.deviceId || videoDevices[0].deviceId;

      // Start continuous scanning
      this.codeReader.decodeFromVideoDevice(deviceId, videoElement.nativeElement, (result, err) => {
        if (result) {
          // Successfully scanned a QR code
          const token = result.getText();
          this.tokenScanned.emit(token);
          this.stopScanning();
        } else if (err && !(err instanceof NotFoundException)) {
          // Log errors that aren't just "no QR code found"
          console.error('Scan error:', err);
        }
      });
    } catch (err) {
      console.error('Failed to start scanning:', err);
      this.error.set('Failed to start camera. Please try again.');
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
    this.error.set(null);
    await this.initializeScanner();
  }
}
