import { Injectable, OnModuleInit } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';

export interface Notification {
    id: string;
    userId: string;
    title: string;
    message: string;
    type: 'info' | 'success' | 'warning' | 'error';
    read: boolean;
    createdAt: string;
}

@Injectable()
export class NotificationsService implements OnModuleInit {
    private notifications: Map<string, Notification> = new Map();
    private readonly filePath = path.join(process.cwd(), 'notifications.json');

    onModuleInit() {
        this.loadNotifications();
    }

    private loadNotifications() {
        if (fs.existsSync(this.filePath)) {
            try {
                const data = fs.readFileSync(this.filePath, 'utf8');
                const notificationsArray = JSON.parse(data);
                this.notifications = new Map(notificationsArray.map((n: Notification) => [n.id, n]));
                console.log(`Loaded ${this.notifications.size} notifications from ${this.filePath}`);
            } catch (error) {
                console.error('Error loading notifications from file:', error);
            }
        } else {
            // Create initial seed data if file doesn't exist
            this.seedData();
        }
    }

    private saveNotifications() {
        try {
            const notificationsArray = Array.from(this.notifications.values());
            fs.writeFileSync(this.filePath, JSON.stringify(notificationsArray, null, 2), 'utf8');
        } catch (error) {
            console.error('Error saving notifications to file:', error);
        }
    }

    // Seed some initial data for testing
    private seedData() {
        // We don't have user IDs here easily without circular dep or looking them up, 
        // but we can create some generic ones or wait for first create.
        // For the MVP "connect to backend" request, let's just leave it empty 
        // and rely on the controller to creating them or manual seeding.
        // Actually, let's create a few dummy ones that might likely match any user 
        // if we filter leniently, or just keep it empty. 
        // Better: Provide a method to create welcome notification for a new user.
    }

    async create(userId: string, title: string, message: string, type: 'info' | 'success' | 'warning' | 'error'): Promise<Notification> {
        const notification: Notification = {
            id: Math.random().toString(36).substr(2, 9),
            userId,
            title,
            message,
            type,
            read: false,
            createdAt: new Date().toISOString(),
        };
        this.notifications.set(notification.id, notification);
        this.saveNotifications();
        return notification;
    }

    async findByUser(userId: string): Promise<Notification[]> {
        return Array.from(this.notifications.values())
            .filter(n => n.userId === userId)
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }

    async markAsRead(id: string, userId: string): Promise<Notification | undefined> {
        const notification = this.notifications.get(id);
        if (notification && notification.userId === userId) {
            notification.read = true;
            this.notifications.set(id, notification);
            this.saveNotifications();
            return notification;
        }
        return undefined;
    }

    async markAllAsRead(userId: string): Promise<void> {
        let changed = false;
        for (const notification of this.notifications.values()) {
            if (notification.userId === userId && !notification.read) {
                notification.read = true;
                this.notifications.set(notification.id, notification);
                changed = true;
            }
        }
        if (changed) this.saveNotifications();
    }
}
