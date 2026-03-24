import { Injectable, OnModuleInit } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { NotificationsGateway } from './notifications.gateway';

export interface Notification {
    id: string;
    userId: string;
    title: string;
    message: string;
    type: 'info' | 'success' | 'warning' | 'error';
    read: boolean;
    createdAt: string;
}

import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import * as webpush from 'web-push';


@Injectable()
export class NotificationsService implements OnModuleInit {
    private notifications: Map<string, Notification> = new Map();
    private readonly filePath = path.join(process.cwd(), 'notifications.json');
    private mailer: nodemailer.Transporter;

    constructor(
        private readonly configService: ConfigService,
        private readonly notificationsGateway: NotificationsGateway
    ) {
        
        const smtpHost = this.configService.get<string>('SMTP_HOST') || 'smtp.ethereal.email';
        const smtpPort = this.configService.get<number>('SMTP_PORT') || 587;
        const smtpUser = this.configService.get<string>('SMTP_USER') || 'ethereal_user';
        const smtpPass = this.configService.get<string>('SMTP_PASS') || 'ethereal_pass';

        this.mailer = nodemailer.createTransport({
            host: smtpHost,
            port: smtpPort,
            secure: false, 
            auth: {
                user: smtpUser,
                pass: smtpPass,
            },
        });

        
        const vapidPublicKey = this.configService.get<string>('VAPID_PUBLIC_KEY') || 'BFZhuGm7mzZ46vV6jPV8KiPOmbjnay0d5lQL9Qm1-rV6x69IBPgyd_nZGMu77y9t3lbLrHkAUprNu-TCtXPcqyY';
        const vapidPrivateKey = this.configService.get<string>('VAPID_PRIVATE_KEY') || 'YQ8ZfVCq3Xi8Dgbb1MZ2Al-fLJZbESHfPn3cATVnUXs';
        const vapidEmail = this.configService.get<string>('VAPID_EMAIL') || 'mailto:admin@stockbud.com';

        webpush.setVapidDetails(
            vapidEmail,
            vapidPublicKey,
            vapidPrivateKey
        );
    }

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

    private seedData() {
    }

    async create(userId: string, title: string, message: string, type: 'info' | 'success' | 'warning' | 'error', channels: string[] = ['in-app']): Promise<Notification> {
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

        
        try {
            this.notificationsGateway.sendNotificationToUser(userId, notification);
        } catch (error) {
            console.error('Failed to send push notification', error);
        }

        return notification;
    }

    async sendEmail(to: string, subject: string, html: string) {
        try {
            const info = await this.mailer.sendMail({
                from: '"StockBud Notification" <notify@stockbud.com>',
                to,
                subject,
                html,
            });
            console.log("Message sent: %s", info.messageId);
            
            console.log("Preview URL: %s", nodemailer.getTestMessageUrl(info));
            return info;
        } catch (error) {
            console.error('Error sending email:', error);
            throw error;
        }
    }

    async sendPush(subscription: any, payload: any) {
        try {
            await webpush.sendNotification(subscription, JSON.stringify(payload));
            console.log('Push notification sent successfully');
            return true;
        } catch (error) {
            console.error('Error sending push notification:', error);
            return false;
        }
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
