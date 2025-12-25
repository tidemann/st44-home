import {
  Component,
  input,
  output,
  effect,
  ChangeDetectionStrategy,
  ElementRef,
  HostListener,
  inject,
} from '@angular/core';

/**
 * Reusable modal component with overlay backdrop, focus trap, and keyboard controls
 *
 * Base component for all modals in the Diddit! app. Provides:
 * - Overlay backdrop (click to close)
 * - ESC key to close
 * - Focus trap (focus stays within modal)
 * - Body scroll prevention when open
 * - Smooth fade/scale animations
 * - Content and actions slots via ng-content
 *
 * Usage:
 * <app-modal [open]="isOpen()" (close)="handleClose()" title="Modal Title">
 *   <div class="modal-content">Your content here</div>
 *   <div class="modal-actions">
 *     <button>Action buttons here</button>
 *   </div>
 * </app-modal>
 */
@Component({
  selector: 'app-modal',
  imports: [],
  templateUrl: './modal.html',
  styleUrl: './modal.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[attr.role]': '"dialog"',
    '[attr.aria-modal]': 'open()',
    '[attr.aria-labelledby]': '"modal-title"',
  },
})
export class Modal {
  /**
   * Whether the modal is open
   */
  open = input<boolean>(false);

  /**
   * Modal title
   */
  title = input<string>('');

  /**
   * Whether clicking the backdrop closes the modal (default: true)
   */
  closeOnBackdropClick = input<boolean>(true);

  /**
   * Whether pressing ESC closes the modal (default: true)
   */
  closeOnEsc = input<boolean>(true);

  /**
   * Event emitted when the modal should close
   */
  closeModal = output<void>();

  /**
   * Previously focused element (to restore focus on close)
   */
  private previouslyFocusedElement: HTMLElement | null = null;

  /**
   * Element reference
   */
  private readonly elementRef = inject(ElementRef<HTMLElement>);

  /**
   * Effect to manage body scroll and focus trap
   */
  constructor() {
    effect(() => {
      if (this.open()) {
        this.onModalOpen();
      } else {
        this.onModalClose();
      }
    });
  }

  /**
   * Handle modal open
   */
  private onModalOpen(): void {
    // Store currently focused element
    this.previouslyFocusedElement = document.activeElement as HTMLElement;

    // Prevent body scroll
    document.body.style.overflow = 'hidden';

    // Focus first focusable element in modal
    setTimeout(() => {
      this.focusFirstElement();
    }, 100);
  }

  /**
   * Handle modal close
   */
  private onModalClose(): void {
    // Restore body scroll
    document.body.style.overflow = '';

    // Restore focus to previously focused element
    if (this.previouslyFocusedElement) {
      this.previouslyFocusedElement.focus();
      this.previouslyFocusedElement = null;
    }
  }

  /**
   * Focus first focusable element in modal
   */
  private focusFirstElement(): void {
    const modal = this.elementRef.nativeElement.querySelector('.modal');
    if (!modal) return;

    const focusableElements = modal.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
    ) as NodeListOf<HTMLElement>;

    if (focusableElements.length > 0) {
      focusableElements[0].focus();
    }
  }

  /**
   * Handle backdrop click
   */
  onBackdropClick(event: MouseEvent): void {
    if (this.closeOnBackdropClick() && event.target === event.currentTarget) {
      this.closeModal.emit();
    }
  }

  /**
   * Handle ESC key press
   */
  @HostListener('document:keydown.escape', ['$event'])
  onEscapeKey(event?: Event): void {
    if (this.open() && this.closeOnEsc()) {
      event?.preventDefault();
      this.closeModal.emit();
    }
  }

  /**
   * Handle overlay keydown events
   */
  onOverlayKeydown(event: KeyboardEvent): void {
    // Tab key is handled by @HostListener
    event.preventDefault();
  }

  /**
   * Handle Tab key for focus trap
   */
  @HostListener('keydown.tab', ['$event'])
  onTabKey(event?: Event): void {
    const keyEvent = event as KeyboardEvent | undefined;
    if (!keyEvent) return;
    if (!this.open()) return;

    const modal = this.elementRef.nativeElement.querySelector('.modal');
    if (!modal) return;

    const focusableElements = Array.from(
      modal.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
      ),
    ) as HTMLElement[];

    if (focusableElements.length === 0) return;

    const firstElement: HTMLElement = focusableElements[0];
    const lastElement: HTMLElement = focusableElements[focusableElements.length - 1];

    // If shift+tab on first element, focus last
    if (keyEvent.shiftKey && document.activeElement === firstElement) {
      keyEvent.preventDefault();
      lastElement.focus();
    }
    // If tab on last element, focus first
    else if (!keyEvent.shiftKey && document.activeElement === lastElement) {
      keyEvent.preventDefault();
      firstElement.focus();
    }
  }

  /**
   * Handle close button click
   */
  onCloseClick(): void {
    this.closeModal.emit();
  }
}
