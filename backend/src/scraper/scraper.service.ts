import { Injectable, NotFoundException, Inject } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { EncryptionService } from '../common/encryption.service';
import { CreateSiteDto } from './dto/create-site.dto';
import { ClientProxy } from '@nestjs/microservices';

@Injectable()
export class ScraperService {
    constructor(
        private prisma: PrismaService,
        private encryptionService: EncryptionService,
        @Inject('SCRAPER_SERVICE') private client: ClientProxy,
    ) {}

    async createSite(userId: string, dto: CreateSiteDto) {
        const { name, url, loginUrl, username, password, schedule, platform } = dto;

        return this.prisma.scrapeSite.create({
            data: {
                userId,
                name,
                url,
                loginUrl,
                schedule: schedule || '0 8 * * *',
                platform,
                credentials: password ? {
                    create: {
                        username,
                        password: this.encryptionService.encrypt(password),
                    }
                } : undefined
            },
            include: {
                credentials: true
            }
        });
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
