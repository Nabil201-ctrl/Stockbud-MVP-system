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

        const user = await this.prisma.user.findUnique({ where: { id: userId } });

        const site = await this.prisma.scrapeSite.create({
            data: {
                userId,
                name,
                url,
                loginUrl,
                requiresLogin: dto.requiresLogin !== undefined ? dto.requiresLogin : true,
                schedule: schedule || '0 8 * * *',
                platform,
                targetStoreId: dto.targetStoreId,
                targetStoreType: dto.targetStoreType,
                status: 'pending'
            },
            include: {
                credentials: true
            }
        });

        console.log(`[ScraperService] Site created with ID: ${site.id}`);

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
                console.error('Failed to send confirmation email to user:', err.message);
            }
        }

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

        const updateData: any = {
            status: 'idle',
        };

        if (site.requiresLogin && username && password) {
            updateData.credentials = {
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
            };
        } else if (site.requiresLogin) {
            // If it requires login but we didn't get credentials, we might want to throw an error 
            // OR just proceed if we are doing a prohibited-check-only verification.
            // For now, let's allow it but log a warning.
            console.warn(`[ScraperService] Site ${cleanId} requires login but no credentials provided.`);
        }

        const updatedSite = await this.prisma.scrapeSite.update({
            where: { id: cleanId },
            data: updateData,
            include: { credentials: true }
        });

        try {
            await this.triggerScrape(site.userId, cleanId);
        } catch (error) {
            console.error('Failed to automatically trigger scrape after verification', error);
        }

        const user = await this.prisma.user.findUnique({ where: { id: site.userId } });
        if (user && user.email) {
            try {
                const title = 'Website Monitoring Activated!';
                const message = `Great news! Your request to monitor <strong>${site.name}</strong> has been verified and activated.<br/><br/>We have already started the first scan of the site. You should see products appearing in your dashboard shortly.`;
                const htmlContent = this.emailService.buildGeneralNotificationHtml(user.name || 'there', title, message);

                await this.emailService.sendEmail({
                    to: [{ email: user.email, name: user.name || '' }],
                    subject: title,
                    htmlContent: htmlContent
                });
            } catch (err) {
                console.error('Failed to send activation email to user:', err.message);
            }
        }

        return updatedSite;
    }

    async getSiteById(siteId: string) {
        const site = await this.prisma.scrapeSite.findUnique({
            where: { id: siteId }
        });
        if (!site) throw new NotFoundException('Site not found');
        return site;
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

        // Update site status to show it's currently being scraped
        await this.prisma.scrapeSite.update({
            where: { id: siteId },
            data: { status: 'scraping' }
        });

        const decryptedPassword = site.credentials?.password
            ? this.encryptionService.decrypt(site.credentials.password)
            : null;

        const payload = {
            jobId: job.id,
            siteId: site.id,
            url: site.url,
            loginUrl: site.loginUrl,
            requiresLogin: site.requiresLogin,
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

        const siteData = site as any;
        let storeId = siteData.targetStoreId;
        let storeType = siteData.targetStoreType;

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

        const savedProducts = [];
        for (const pData of products) {
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

        await this.prisma.scrapeSnapshot.create({
            data: {
                siteId: siteId,
                jobId: jobId,
                data: products
            }
        });

        await this.prisma.scrapeSite.update({
            where: { id: siteId },
            data: {
                status: 'idle',
                lastScrapeAt: new Date()
            }
        });

        console.log(`[ScraperService] Successfully processed ${savedProducts.length} products for site ${site.name}`);
    }

    async debugGetAllSites() {
        return this.prisma.scrapeSite.findMany();
    }
}
