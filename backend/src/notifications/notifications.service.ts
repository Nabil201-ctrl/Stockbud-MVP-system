import { Injectable, OnModuleInit } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { NotificationsGateway } from './notifications.gateway';
import { PrismaService } from '../database/prisma.service';

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
    private mailer: nodemailer.Transporter;

    constructor(
        private readonly configService: ConfigService,
        private readonly notificationsGateway: NotificationsGateway,
        private readonly db: PrismaService
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
        } catch (error) {
            console.error('Failed to send push notification', error);
        }

        return notification as any;
    }

    async sendEmail(to: string, subject: string, html: string) {
        try {
            const info = await this.mailer.sendMail({
                from: '"StockBud Notification" <notify@stockbud.com>',
                to,
                subject,
                html,
            });
            return info;
        } catch (error) {
            console.error('Error sending email:', error);
            throw error;
        }
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

