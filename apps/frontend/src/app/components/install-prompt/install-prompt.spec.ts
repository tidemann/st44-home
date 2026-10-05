import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { InstallPrompt } from './install-prompt';
import { PwaService, type InstallPlatform } from '../../services/pwa.service';

describe('InstallPrompt', () => {
  let fixture: ComponentFixture<InstallPrompt>;
  const platform = signal<InstallPlatform>(null);
  const pwa = {
    installPlatform: platform,
    install: vi.fn().mockResolvedValue(true),
    dismissInstall: vi.fn(),
  };

  beforeEach(async () => {
    platform.set(null);
    pwa.install.mockClear();
    pwa.dismissInstall.mockClear();
    await TestBed.configureTestingModule({
      imports: [InstallPrompt],
      providers: [{ provide: PwaService, useValue: pwa }],
    }).compileComponents();
    fixture = TestBed.createComponent(InstallPrompt);
  });

  function buttons(): HTMLButtonElement[] {
    return Array.from(fixture.nativeElement.querySelectorAll('button'));
  }

  it('renders nothing when there is nothing to install', () => {
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.install-card')).toBeNull();
  });

  it('shows the two Safari steps on iPhone, with only "Ikke nå"', () => {
    platform.set('ios');
    fixture.detectChanges();

    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('Legg Diddit på hjemskjermen');
    expect(text).toContain('Legg til på Hjem-skjerm');
    expect(buttons().map((b) => b.textContent?.trim())).toEqual(['Ikke nå']);
  });

  it('installs from the Android card', () => {
    platform.set('android');
    fixture.detectChanges();

    const install = buttons().find((b) => b.textContent?.includes('Installer'));
    install?.click();
    expect(pwa.install).toHaveBeenCalled();
  });

  it('hides on "Ikke nå"', () => {
    platform.set('android');
    fixture.detectChanges();

    buttons()
      .find((b) => b.textContent?.includes('Ikke nå'))
      ?.click();
    expect(pwa.dismissInstall).toHaveBeenCalled();
  });

  it('can be forced to a variant', () => {
    fixture.componentRef.setInput('platform', 'ios');
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.install-steps')).not.toBeNull();
  });
});
