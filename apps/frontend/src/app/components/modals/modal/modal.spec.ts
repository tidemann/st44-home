import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Modal } from './modal';
import modalCss from './modal.css' with { loader: 'text' };

describe('Modal', () => {
  let component: Modal;
  let fixture: ComponentFixture<Modal>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Modal],
    }).compileComponents();

    fixture = TestBed.createComponent(Modal);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should not render when open is false', () => {
    fixture.componentRef.setInput('open', false);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.modal-overlay')).toBeNull();
  });

  it('should render when open is true', () => {
    fixture.componentRef.setInput('open', true);
    fixture.componentRef.setInput('title', 'Test Modal');
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.modal-overlay')).toBeTruthy();
    expect(compiled.querySelector('.modal-title')?.textContent).toContain('Test Modal');
  });

  it('should emit closeModal event when close button is clicked', () => {
    let closeEmitted = false;
    component.closeModal.subscribe(() => {
      closeEmitted = true;
    });

    component.onCloseClick();
    expect(closeEmitted).toBe(true);
  });

  it('should emit closeModal event on backdrop click when closeOnBackdropClick is true', () => {
    fixture.componentRef.setInput('closeOnBackdropClick', true);
    let closeEmitted = false;
    component.closeModal.subscribe(() => {
      closeEmitted = true;
    });

    const target = {};
    const event = new MouseEvent('click');
    Object.defineProperty(event, 'target', { value: target, writable: false });
    Object.defineProperty(event, 'currentTarget', { value: target, writable: false });
    component.onBackdropClick(event);

    expect(closeEmitted).toBe(true);
  });

  it('labels the dialog with a generated title id, never a shared one', () => {
    const second = TestBed.createComponent(Modal);
    for (const f of [fixture, second]) {
      f.componentRef.setInput('open', true);
      f.componentRef.setInput('title', 'Tittel');
      f.detectChanges();
    }
    const ids = [fixture, second].map((f) => {
      const dialog = (f.nativeElement as HTMLElement).querySelector('[role="dialog"]');
      const title = (f.nativeElement as HTMLElement).querySelector('.modal-title');
      expect(dialog?.getAttribute('aria-modal')).toBe('true');
      expect(dialog?.getAttribute('aria-labelledby')).toBe(title?.id);
      return title?.id;
    });
    expect(ids[0]).not.toBe(ids[1]);
  });

  it('hides the close button when showClose is false', () => {
    fixture.componentRef.setInput('open', true);
    fixture.componentRef.setInput('showClose', false);
    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).querySelector('.modal-close')).toBeNull();
  });
});

describe('Modal caret (popup rule 6, ST-2143)', () => {
  const down = 'M1.5 1.5 7 7l5.5-5.5';
  const up = 'M1.5 7.5 7 2l5.5 5.5';
  let style: HTMLStyleElement;
  let host: HTMLElement;

  // The desktop block of modal.css as the page sees it: jsdom does not apply @media rules
  beforeEach(() => {
    const desktop = modalCss.slice(modalCss.indexOf('@media (min-width: 1024px)'));
    style = document.createElement('style');
    style.textContent = desktop
      .slice(desktop.indexOf('{') + 1, desktop.lastIndexOf('}'))
      .replaceAll('::ng-deep ', '');
    document.head.appendChild(style);
    host = document.createElement('div');
    host.innerHTML = `<div class="modal"><select aria-expanded="false"></select><input type="datetime-local" aria-expanded="true" /></div>`;
    document.body.appendChild(host);
  });

  afterEach(() => {
    style.remove();
    host.remove();
  });

  const caret = (el: Element | null): string => getComputedStyle(el as Element).backgroundImage;

  it('points down while the menu is closed', () => {
    expect(caret(host.querySelector('select'))).toContain(down);
  });

  it('points up while the menu is open', () => {
    host.querySelector('select')?.setAttribute('aria-expanded', 'true');
    expect(caret(host.querySelector('select'))).toContain(up);
  });

  it('leaves the date field caret pointing down', () => {
    expect(caret(host.querySelector('input'))).toContain(down);
  });
});
