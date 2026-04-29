import { Injectable, NotFoundException, Inject } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { EncryptionService } from '../common/encryption.service';
import { EmailService } from '../email/email.service';
import { ConfigService } from '@nestjs/config';
import { CreateSiteDto } from './dto/create-site.dto';
import { AddCredentialsDto } from './dto/add-credentials.dto';
import { ClientProxy } from '@nestjs/microservices';

@Injectable()
export class ScraperService {
    constructor(
        private prisma: PrismaService,
        private encryptionService: EncryptionService,
        private emailService: EmailService,
        private configService: ConfigService,
        @Inject('SCRAPER_SERVICE') private client: ClientProxy,
    ) { }

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

        // Step 1: Notify the USER (via Brevo API)
        // Let them know their request was received and is being processed.
        if (user && user.email) {
            try {
                const title = 'Website Monitoring Setup Started';
                const message = `We have successfully received your request to monitor <strong>${name}</strong> (${url}).<br/><br/>Our team is currently verifying the site status and setting up the AI connection. You don't need to do anything else right now. We will notify you once the monitoring starts successfully.`;
                const htmlContent = this.emailService.buildGeneralNotificationHtml(user.name || 'there', title, message);
                
                await this.emailService.sendEmail({
                    to: [{ email: user.email, name: user.name || '' }],
                    subject: title,
                    htmlContent: htmlContent
                    // useScraperTransporter is NOT set → uses Brevo API
                });
            } catch (err) {
                console.error('Failed to send confirmation email to user:', err.message);
            }
        }

        // Step 2: Notify the EMPLOYEE (via Gmail SMTP)
        // Sent FROM SCRAPER_GMAIL_USER → TO STAFF_NOTIFICATION_EMAIL.
        try {
            const subject = `ACTION REQUIRED: New Site Monitoring Requested - ${name}`;
            const frontendUrl = this.configService.get<string>('FRONTEND_URL') || 'http://localhost';
            const html = `
                    <h2>New Monitoring Request</h2>
                    <p>A user has requested monitoring for a new site. Please follow these steps:</p>
                    <ol>
                        <li>Visit the <strong>Target URL</strong> or <strong>Login URL</strong> below.</li>
                        <li><strong>Create a new account</strong> on that platform using our internal credentials.</li>
                        <li>Once the account is ready, click the <strong>Verify Site Link</strong> below to feed the credentials back into Stockbud.</li>
                    </ol>
                    <hr/>
                    <p><strong>User:</strong> ${user?.email || userId}</p>
                    <p><strong>Site Name:</strong> ${name}</p>
                    <p><strong>Target URL:</strong> <a href="${url}">${url}</a></p>
                    <p><strong>Login URL:</strong> <a href="${loginUrl || '#'}">${loginUrl || 'Not provided'}</a></p>
                    <p><strong>Site ID:</strong> <code>${site.id}</code></p>
                    <br/>
                    <p><strong>Action Link:</strong> <a href="${frontendUrl}/scraper/verify/${site.id}" style="background-color: #2563eb; color: white; padding: 10px 15px; text-decoration: none; border-radius: 5px;">Verify Site & Feed Credentials</a></p>
                `;

            await this.emailService.sendStaffAlert(subject, html);
        } catch (err) {
            console.error('Failed to send staff alert email:', err.message);
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
