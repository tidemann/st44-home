import { Injectable, signal, computed } from '@angular/core';

/**
 * Notification type determines the visual style and icon
 */
export type NotificationType = 'success' | 'error' | 'warning' | 'info';

/**
 * Notification structure for display
 */
export interface Notification {
  id: string;
  type: NotificationType;
  message: string;
  title?: string;
  duration: number;
  createdAt: number;
}

/**
 * Options for showing a notification
 */
export interface NotificationOptions {
  /** Optional title shown above the message */
  title?: string;
  /** Duration in milliseconds before auto-dismiss (0 = no auto-dismiss) */
  duration?: number;
  /** Whether to replace existing notifications of the same type */
  replace?: boolean;
}

/**
 * Default durations for different notification types
 */
const DEFAULT_DURATIONS: Record<NotificationType, number> = {
  success: 3000,
  info: 4000,
  warning: 5000,
  error: 6000,
};

/**
 * Maximum number of notifications to show simultaneously
 */
const MAX_NOTIFICATIONS = 5;

/**
 * Service responsible for user notifications (toasts/snackbars)
 *
 * Single Responsibility: Display and manage user-facing notifications
 *
 * Features:
 * - Multiple notification types (success, error, warning, info)
 * - Auto-dismiss with configurable duration
 * - Manual dismiss capability
 * - Maximum notification limit with FIFO removal
 * - Signal-based reactive state
 *
 * @example
 * // Show a success notification
 * notificationService.success('Task completed successfully!');
 *
 * // Show an error with custom title
 * notificationService.error('Failed to save changes', { title: 'Save Error' });
 *
 * // Show a warning that stays until dismissed
 * notificationService.warning('Session expiring soon', { duration: 0 });
 */
@Injectable({
  providedIn: 'root',
})
export class NotificationService {
  private readonly notificationsSignal = signal<Notification[]>([]);
  private readonly timers = new Map<string, ReturnType<typeof setTimeout>>();

  /** Observable list of active notifications */
  readonly notifications = this.notificationsSignal.asReadonly();

  /** Whether there are any active notifications */
  readonly hasNotifications = computed(() => this.notificationsSignal().length > 0);

  /** Count of active notifications */
  readonly notificationCount = computed(() => this.notificationsSignal().length);

  /**
   * Show a success notification
   *
   * @param message - The message to display
   * @param options - Optional configuration
   */
  success(message: string, options?: NotificationOptions): void {
    this.show('success', message, options);
  }

  /**
   * Show an error notification
   *
   * @param message - The message to display
   * @param options - Optional configuration
   */
  error(message: string, options?: NotificationOptions): void {
    this.show('error', message, options);
  }

  /**
   * Show a warning notification
   *
   * @param message - The message to display
   * @param options - Optional configuration
   */
  warning(message: string, options?: NotificationOptions): void {
    this.show('warning', message, options);
  }

  /**
   * Show an info notification
   *
   * @param message - The message to display
   * @param options - Optional configuration
   */
  info(message: string, options?: NotificationOptions): void {
    this.show('info', message, options);
  }

  /**
   * Show a notification
   *
   * @param type - The notification type
   * @param message - The message to display
   * @param options - Optional configuration
   */
  show(type: NotificationType, message: string, options?: NotificationOptions): void {
    const duration = options?.duration ?? DEFAULT_DURATIONS[type];

    // If replace is true, remove existing notifications of the same type
    if (options?.replace) {
      const current = this.notificationsSignal();
      const toRemove = current.filter((n) => n.type === type);
      toRemove.forEach((n) => this.dismiss(n.id));
    }

    const notification: Notification = {
      id: this.generateId(),
      type,
      message,
      title: options?.title,
      duration,
      createdAt: Date.now(),
    };

    // Add new notification, respecting max limit
    this.notificationsSignal.update((notifications) => {
      const updated = [...notifications, notification];
      // Remove oldest if over limit
      while (updated.length > MAX_NOTIFICATIONS) {
        const removed = updated.shift();
        if (removed) {
          this.clearTimer(removed.id);
        }
      }
      return updated;
    });

    // Set auto-dismiss timer if duration > 0
    if (duration > 0) {
      const timer = setTimeout(() => {
        this.dismiss(notification.id);
      }, duration);
      this.timers.set(notification.id, timer);
    }
  }

  /**
   * Dismiss a specific notification
   *
   * @param id - The notification ID to dismiss
   */
  dismiss(id: string): void {
    this.clearTimer(id);
    this.notificationsSignal.update((notifications) => notifications.filter((n) => n.id !== id));
  }

  /**
   * Dismiss all notifications
   */
  dismissAll(): void {
    // Clear all timers
    this.timers.forEach((timer) => clearTimeout(timer));
    this.timers.clear();

    // Clear all notifications
    this.notificationsSignal.set([]);
  }

  /**
   * Clear timer for a notification
   */
  private clearTimer(id: string): void {
    const timer = this.timers.get(id);
    if (timer) {
      clearTimeout(timer);
      this.timers.delete(id);
    }
  }

  /**
   * Generate a unique ID for a notification
   */
  private generateId(): string {
    return `notification-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  }
}
