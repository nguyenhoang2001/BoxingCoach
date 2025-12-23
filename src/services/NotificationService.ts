/**
 * Notification Service - Manages user notifications and alerts
 * Provides toast notifications, error alerts, and system messages
 */

import { EventEmitter } from 'events';
import { Notification } from '../types';

export class NotificationService extends EventEmitter {
  private notifications: Notification[] = [];
  private eventBus: EventEmitter;

  constructor(eventBus: EventEmitter) {
    super();
    this.eventBus = eventBus;
  }

  public async initialize(): Promise<void> {
    this.emit('initialized');
  }

  public showNotification(notification: Notification): void {
    this.notifications.push(notification);
    this.emit('notificationAdded', notification);
    this.eventBus.emit('notification', notification);

    if (notification.autoHide && notification.duration) {
      setTimeout(() => {
        this.removeNotification(notification.id);
      }, notification.duration);
    }
  }

  public removeNotification(id: string): void {
    const index = this.notifications.findIndex(n => n.id === id);
    if (index > -1) {
      const notification = this.notifications[index];
      this.notifications.splice(index, 1);
      this.emit('notificationRemoved', notification);
    }
  }

  public getNotifications(): Notification[] {
    return [...this.notifications];
  }

  public clearAll(): void {
    this.notifications = [];
    this.emit('notificationsCleared');
  }

  public getStatus(): any {
    return {
      activeNotifications: this.notifications.length
    };
  }
}