import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BrowserMultiFormatReader } from '@zxing/library';
import { QrCodeScannerComponent } from './qr-code-scanner';

describe('QrCodeScannerComponent', () => {
  let fixture: ComponentFixture<QrCodeScannerComponent>;
  let getUserMedia: ReturnType<typeof vi.fn>;
  let stopTrack: ReturnType<typeof vi.fn>;
  const originalMediaDevices = navigator.mediaDevices;

  function setMediaDevices(value: unknown): void {
    Object.defineProperty(navigator, 'mediaDevices', { value, configurable: true });
  }

  beforeEach(async () => {
    stopTrack = vi.fn();
    getUserMedia = vi.fn().mockResolvedValue({ getTracks: () => [{ stop: stopTrack }] });
    setMediaDevices({ getUserMedia });

    await TestBed.configureTestingModule({
      imports: [QrCodeScannerComponent],
    }).compileComponents();
  });

  afterEach(() => {
    setMediaDevices(originalMediaDevices);
    vi.restoreAllMocks();
  });

  async function start(): Promise<void> {
    fixture = TestBed.createComponent(QrCodeScannerComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  }

  it('starts the back camera on the rendered video element and releases the permission probe', async () => {
    const decode = vi
      .spyOn(BrowserMultiFormatReader.prototype, 'decodeFromConstraints')
      .mockResolvedValue(undefined);

    await start();

    expect(stopTrack).toHaveBeenCalled();
    expect(decode).toHaveBeenCalledTimes(1);
    const [constraints, video] = decode.mock.calls[0];
    expect(constraints).toEqual({ video: { facingMode: { ideal: 'environment' } } });
    expect(video).toBeInstanceOf(HTMLVideoElement);
    expect((video as HTMLVideoElement).hasAttribute('playsinline')).toBe(true);
    const active = fixture.nativeElement.querySelector('.scanner-active');
    expect(active.classList.contains('is-hidden')).toBe(false);
  });

  it('emits the scanned token', async () => {
    let callback: ((result: { getText(): string } | null) => void) | undefined;
    vi.spyOn(BrowserMultiFormatReader.prototype, 'decodeFromConstraints').mockImplementation(
      async (_c, _v, cb) => {
        callback = cb as unknown as typeof callback;
      },
    );
    vi.spyOn(BrowserMultiFormatReader.prototype, 'reset').mockImplementation(() => undefined);

    await start();
    const tokens: string[] = [];
    fixture.componentInstance.tokenScanned.subscribe((t) => tokens.push(t));
    callback?.({ getText: () => 'qr-token-123' });

    expect(tokens).toEqual(['qr-token-123']);
  });

  it('shows the permission screen in Norwegian when the camera is refused', async () => {
    getUserMedia.mockRejectedValue(new DOMException('denied', 'NotAllowedError'));

    await start();

    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('Kameratilgang påkrevd');
    expect(text).toContain('for å skanne');
  });

  it('shows only the no-camera screen when the device has no camera', async () => {
    getUserMedia.mockRejectedValue(new DOMException('none', 'NotFoundError'));

    await start();

    expect(fixture.nativeElement.querySelector('.no-camera')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('.error-state')).toBeNull();
  });

  it('never starts the camera when closed during the permission prompt', async () => {
    let grant: (stream: unknown) => void = () => undefined;
    getUserMedia.mockReturnValue(new Promise((resolve) => (grant = resolve)));
    const decode = vi
      .spyOn(BrowserMultiFormatReader.prototype, 'decodeFromConstraints')
      .mockResolvedValue(undefined);

    fixture = TestBed.createComponent(QrCodeScannerComponent);
    fixture.detectChanges();
    fixture.destroy();
    grant({ getTracks: () => [{ stop: stopTrack }] });
    await new Promise((resolve) => setTimeout(resolve));

    expect(stopTrack).toHaveBeenCalled();
    expect(decode).not.toHaveBeenCalled();
  });

  it('stops the camera and reports cancel', async () => {
    vi.spyOn(BrowserMultiFormatReader.prototype, 'decodeFromConstraints').mockResolvedValue(
      undefined,
    );
    const reset = vi.spyOn(BrowserMultiFormatReader.prototype, 'reset');
    await start();
    let cancelled = false;
    fixture.componentInstance.scanCancelled.subscribe(() => (cancelled = true));

    (fixture.nativeElement.querySelector('.btn-cancel') as HTMLButtonElement).click();

    expect(reset).toHaveBeenCalled();
    expect(cancelled).toBe(true);
  });
});
