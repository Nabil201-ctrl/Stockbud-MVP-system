import { Injectable, NotFoundException, Inject } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { EncryptionService } from '../common/encryption.service';
import { EmailService } from '../email/email.service';
import { CreateSiteDto } from './dto/create-site.dto';
import { AddCredentialsDto } from './dto/add-credentials.dto';
import { ClientProxy } from '@nestjs/microservices';
import * as nodemailer from 'nodemailer';

@Injectable()
export class ScraperService {
    private transporter: nodemailer.Transporter;

    constructor(
        private prisma: PrismaService,
        private encryptionService: EncryptionService,
        private emailService: EmailService,
        @Inject('SCRAPER_SERVICE') private client: ClientProxy,
    ) {
        // Initialize simple Nodemailer transport
        // Using environment variables or fallback values for MVP
        const smtpConfig: any = {
            host: process.env.SMTP_HOST || 'smtp.gmail.com',
            port: parseInt(process.env.SMTP_PORT) || 587,
            secure: process.env.SMTP_SECURE === 'true',
        };

        if (process.env.SMTP_USER && process.env.SMTP_PASS) {
            smtpConfig.auth = {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS,
            };
        }

        this.transporter = nodemailer.createTransport(smtpConfig);
    }

    async createSite(userId: string, dto: CreateSiteDto) {
        const { name, url, loginUrl, schedule, platform } = dto;

        // Ensure user exists to get their email
        const user = await this.prisma.user.findUnique({ where: { id: userId } });

        const site = await this.prisma.scrapeSite.create({
            data: {
                userId,
                name,
                url,
                loginUrl,
                schedule: schedule || '0 8 * * *',
                platform,
                status: 'pending' // Indicates verification is ongoing
            },
            include: {
                credentials: true
            }
        });

        // 1. Send Verification Email to User using the normal email service (Brevo)
        if (user && user.email) {
            try {
                const title = 'Website Monitoring Setup Started';
                const message = `We have successfully received your request to monitor <strong>${name}</strong> (${url}).<br/><br/>Our team is currently verifying the site status and setting up the AI connection. You don't need to do anything else right now. We will notify you once the monitoring starts successfully.`;
                const htmlContent = this.emailService.buildGeneralNotificationHtml(user.name || 'there', title, message);
                
                await this.emailService.sendEmail({
                    to: [{ email: user.email, name: user.name || '' }],
                    subject: title,
                    htmlContent: htmlContent
                });
            } catch (err) {
                console.error('Failed to send verification email to user:', err.message);
            }
        }

        // 2. Send Action Required Email to Staff
        try {
            const staffEmail = process.env.SMTP_USER || 'support@stockbud.xyz';
            await this.transporter.sendMail({
                from: '"Stockbud System Alerts" <alerts@stockbud.xyz>',
                to: staffEmail,
                subject: `ACTION REQUIRED: New Site Monitoring Requested - ${name}`,
                html: `
                    <h2>New Monitoring Request</h2>
                    <p><strong>User:</strong> ${user?.email || userId}</p>
                    <p><strong>Site Name:</strong> ${name}</p>
                    <p><strong>Target URL:</strong> ${url}</p>
                    <p><strong>Login URL:</strong> ${loginUrl || 'Not provided'}</p>
                    <p><strong>Action Required:</strong> Please manually create an account/credentials for this site, add them to the database for this site ID (<code>${site.id}</code>), and move it to the next stage so the AI model can handle the rest.</p>
                    <p>Click here to provide the credentials: <a href="${process.env.FRONTEND_URL || 'http://localhost'}/scraper/verify/${site.id}">Verify Site Link</a></p>
                `
            });
        } catch (err) {
            console.error('Failed to send notification email to staff:', err.message);
        }

        return site;
    }

    async getUserSites(userId: string) {
        return this.prisma.scrapeSite.findMany({
            where: { userId },
            include: {
                credentials: {
                    select: {
                        username: true,
                        updatedAt: true
                    }
                },
                snapshots: {
                    take: 1,
                    orderBy: { createdAt: 'desc' }
                }
            }
        });
    }

    async getSiteDetails(userId: string, siteId: string) {
        const site = await this.prisma.scrapeSite.findFirst({
            where: { id: siteId, userId },
            include: {
                credentials: true,
                snapshots: {
                    take: 10,
                    orderBy: { createdAt: 'desc' }
                },
                jobs: {
                    take: 10,
                    orderBy: { createdAt: 'desc' }
                }
            }
        });

        if (!site) {
            throw new NotFoundException('Site not found');
        }

        return site;
    }

    async verifySite(siteId: string, dto: AddCredentialsDto) {
        const { username, password } = dto;

        const site = await this.prisma.scrapeSite.findUnique({
            where: { id: siteId },
        });

        if (!site) {
            throw new NotFoundException('Site not found');
        }

        const updatedSite = await this.prisma.scrapeSite.update({
            where: { id: siteId },
            data: {
                status: 'idle', // Ready to be scraped
                credentials: {
                    create: {
                        username,
                        password: this.encryptionService.encrypt(password),
                    }
                }
            }
        });

        // Trigger the first scrape now that credentials are provided
        try {
            await this.triggerScrape(site.userId, site.id);
        } catch (error) {
            console.error('Failed to automatically trigger scrape after verification', error);
        }

        return updatedSite;
    }

    async triggerScrape(userId: string, siteId: string) {
        const site = await this.prisma.scrapeSite.findFirst({
            where: { id: siteId, userId },
            include: { credentials: true }
        });

        if (!site) {
            throw new NotFoundException('Site not found');
        }

        const job = await this.prisma.scrapeJob.create({
            data: {
                siteId,
                type: 'manual',
                status: 'pending'
            }
        });

        // Decrypt password before sending to worker
        const decryptedPassword = site.credentials?.password 
            ? this.encryptionService.decrypt(site.credentials.password) 
            : null;

        const payload = {
            jobId: job.id,
            siteId: site.id,
            url: site.url,
            loginUrl: site.loginUrl,
            username: site.credentials?.username,
            password: decryptedPassword,
            platform: site.platform
        };

        this.client.emit('scrape_request', payload);

        return { success: true, jobId: job.id };
    }

    async deleteSite(userId: string, siteId: string) {
        const site = await this.prisma.scrapeSite.findFirst({
            where: { id: siteId, userId }
        });

        if (!site) {
            throw new NotFoundException('Site not found');
        }

        return this.prisma.scrapeSite.delete({
            where: { id: siteId }
        });
    }
}
