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
                targetStoreId: dto.targetStoreId,
                targetStoreType: dto.targetStoreType,
                status: 'pending' // Indicates verification is ongoing
            },
            include: {
                credentials: true
            }
        });

        console.log(`[ScraperService] Site created with ID: ${site.id}`);

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
        const cleanId = siteId.trim().replace(/\/$/, '');
        console.log(`[ScraperService] Verifying site: ${cleanId}`);

        const site = await this.prisma.scrapeSite.findUnique({
            where: { id: cleanId },
        });

        if (!site) {
            const allSites = await this.prisma.scrapeSite.findMany({ select: { id: true } });
            const allIds = allSites.map(s => s.id).join(', ');
            console.error(`[ScraperService] Site not found: ${cleanId}. Available IDs: ${allIds}`);
            throw new NotFoundException('Site not found');
        }

        const updatedSite = await this.prisma.scrapeSite.update({
            where: { id: cleanId },
            data: {
                status: 'idle', // Ready to be scraped
                credentials: {
                    upsert: {
                        create: {
                            username,
                            password: this.encryptionService.encrypt(password),
                        },
                        update: {
                            username,
                            password: this.encryptionService.encrypt(password),
                        }
                    }
                }
            },
            include: { credentials: true }
        });

        // Trigger the first scrape now that credentials are provided
        try {
            await this.triggerScrape(site.userId, cleanId);
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

    async updateSite(userId: string, siteId: string, dto: Partial<CreateSiteDto>) {
        const site = await this.prisma.scrapeSite.findFirst({
            where: { id: siteId, userId }
        });

        if (!site) {
            throw new NotFoundException('Site not found');
        }

        return this.prisma.scrapeSite.update({
            where: { id: siteId },
            data: dto
        });
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

    async handleScrapeResult(payload: any) {
        const { jobId, siteId, success, products, error } = payload;
        console.log(`[ScraperService] Handling result for job ${jobId}, success: ${success}`);

        const site = await this.prisma.scrapeSite.findUnique({
            where: { id: siteId },
            include: { user: true }
        });

        if (!site) {
            console.error(`[ScraperService] Site not found for result: ${siteId}`);
            return;
        }

        // 1. Update ScrapeJob
        await this.prisma.scrapeJob.update({
            where: { id: jobId },
            data: {
                status: success ? 'completed' : 'failed',
                errorMessage: error || null,
                completedAt: new Date()
            }
        });

        if (!success || !products) {
            await this.prisma.scrapeSite.update({
                where: { id: siteId },
                data: { status: 'failed' }
            });
            return;
        }

        // 2. Determine the target store
        let storeId = site.targetStoreId;
        let storeType = site.targetStoreType;

        // Fallback: If no target store is set, use/create a 'website' store
        if (!storeId) {
            let store = await this.prisma.socialStore.findFirst({
                where: {
                    userId: site.userId,
                    name: site.name,
                    type: 'website'
                }
            });

            if (!store) {
                store = await this.prisma.socialStore.create({
                    data: {
                        userId: site.userId,
                        name: site.name,
                        type: 'website',
                        contact: site.url,
                        description: `Scraped from ${site.url}`
                    }
                });
            }
            storeId = store.id;
            storeType = 'social';
        }

        // 3. Save products
        const savedProducts = [];
        for (const pData of products) {
            // Try to find existing product by SKU or Title in this specific store
            const existing = await this.prisma.product.findFirst({
                where: {
                    userId: site.userId,
                    OR: [
                        { socialStoreId: storeType === 'social' ? storeId : undefined },
                        { shopifyStoreId: storeType === 'shopify' ? storeId : undefined }
                    ],
                    title: pData.name
                }
            });

            const productData: any = {
                userId: site.userId,
                title: pData.name,
                price: parseFloat(pData.price) || 0,
                inventory: parseInt(pData.inventory) || 0,
                source: storeType === 'shopify' ? 'shopify' : (site.platform || 'website'),
                status: 'active',
                images: pData.image ? [{ src: pData.image }] : (existing?.images as any[] || [])
            };

            if (storeType === 'shopify') {
                productData.shopifyStoreId = storeId;
            } else {
                productData.socialStoreId = storeId;
            }

            if (existing) {
                const updated = await this.prisma.product.update({
                    where: { id: existing.id },
                    data: productData
                });
                savedProducts.push(updated);
            } else {
                const created = await this.prisma.product.create({
                    data: productData
                });
                savedProducts.push(created);
            }
        }

        // 4. Create ScrapeSnapshot
        await this.prisma.scrapeSnapshot.create({
            data: {
                siteId: siteId,
                jobId: jobId,
                data: products
            }
        });

        // 5. Update site status
        await this.prisma.scrapeSite.update({
            where: { id: siteId },
            data: {
                status: 'idle',
                lastScrapeAt: new Date()
            }
        });

        console.log(`[ScraperService] Successfully processed ${savedProducts.length} products for site ${site.name}`);
    }

    // DEBUG ONLY: Remove before production
    async debugGetAllSites() {
        return this.prisma.scrapeSite.findMany();
    }
}
