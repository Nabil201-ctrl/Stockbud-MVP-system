import { Injectable, OnModuleInit } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { NotificationsGateway } from './notifications.gateway';
import { PrismaService } from '../database/prisma.service';
import { UsersService } from '../users/users.service';

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
import * as webpush from 'web-push';
import { EmailService } from '../email/email.service';


@Injectable()
export class NotificationsService implements OnModuleInit {
    constructor(
        private readonly configService: ConfigService,
        private readonly notificationsGateway: NotificationsGateway,
        private readonly db: PrismaService,
        private readonly emailService: EmailService,
        private readonly usersService: UsersService
    ) {
        const vapidPublicKey = this.configService.get<string>('VAPID_PUBLIC_KEY') || 'BFZhuGm7mzZ46vV6jPV8KiPOmbjnay0d5lQL9Qm1-rV6x69IBPgyd_nZGMu77y9t3lbLrHkAUprNu-TCtXPcqyY';
        const vapidPrivateKey = this.configService.get<string>('VAPID_PRIVATE_KEY') || 'YQ8ZfVCq3Xi8Dgbb1MZ2Al-fLJZbESHfPn3cATVnUXs';
        const vapidEmail = this.configService.get<string>('VAPID_EMAIL') || 'mailto:admin@stockbud.com';

        webpush.setVapidDetails(
            vapidEmail,
            vapidPublicKey,
            vapidPrivateKey
        );
    }

    async onModuleInit() { }

    async create(userId: string, title: string, message: string, type: 'info' | 'success' | 'warning' | 'error', channels: string[] = ['in-app']): Promise<Notification> {
        const notificationData: any = {
            userId,
            title,
            message,
            type,
            read: false,
        };

        const notification = await this.db.createNotification(userId, notificationData);

        try {
            this.notificationsGateway.sendNotificationToUser(userId, notification);

            // Only send email if requested in channels
            const user = await this.usersService.findById(userId);
            if (channels.includes('email') && user && user.email) {
                await this.emailService.sendEmail({
                    to: [{ email: user.email, name: user.name || 'User' }],
                    subject: `StockBud: ${title}`,
                    htmlContent: this.emailService.buildGeneralNotificationHtml(user.name || 'User', title, message),
                });
            }
        } catch (error) {
            console.error('Failed to send push/email notification', error);
        }

        return notification as any;
    }

    async sendEmail(to: string, subject: string, html: string) {
        return this.emailService.sendEmail({
            to: [{ email: to }],
            subject,
            htmlContent: html,
        });
    }

    async sendPush(subscription: any, payload: any) {
        try {
            await webpush.sendNotification(subscription, JSON.stringify(payload));
            return true;
        } catch (error) {
            console.error('Error sending push notification:', error);
            return false;
        }
    }

    async findByUser(userId: string): Promise<Notification[]> {
        const notifications = await this.db.getNotificationsByUserId(userId);
        return notifications.map(n => ({
            ...n,
            type: n.type as any,
            createdAt: n.createdAt.toISOString()
        }));
    }

    async markAsRead(id: string, userId: string): Promise<Notification | undefined> {
        const notification = await this.db.updateNotification(id, { read: true });
        if (notification && notification.userId === userId) {
            return {
                ...notification,
                type: notification.type as any,
                createdAt: notification.createdAt.toISOString()
            };
        }
        return undefined;
    }

    async markAllAsRead(userId: string): Promise<void> {
        await this.db.updateManyNotifications(userId, { read: true });
    }
}

