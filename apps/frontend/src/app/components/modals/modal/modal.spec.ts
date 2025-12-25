import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Modal } from './modal';

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
});
