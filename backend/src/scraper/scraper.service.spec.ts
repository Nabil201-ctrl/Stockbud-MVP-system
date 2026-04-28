import { Test, TestingModule } from '@nestjs/testing';
import { ScraperService } from './scraper.service';
import { PrismaService } from '../database/prisma.service';
import { EncryptionService } from '../common/encryption.service';
import { EmailService } from '../email/email.service';
import { ClientProxy } from '@nestjs/microservices';
import * as nodemailer from 'nodemailer';

describe('ScraperService', () => {
    let service: ScraperService;
    let prisma: PrismaService;
    let encryptionService: EncryptionService;
    let emailService: EmailService;
    let clientProxy: ClientProxy;
    let transporterMock: any;

    beforeEach(async () => {
        transporterMock = {
            sendMail: jest.fn().mockResolvedValue({ messageId: 'test-id' }),
        };

        jest.spyOn(nodemailer, 'createTransport').mockReturnValue(transporterMock as any);

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                ScraperService,
                {
                    provide: PrismaService,
                    useValue: {
                        user: {
                            findUnique: jest.fn(),
                        },
                        scrapeSite: {
                            create: jest.fn(),
                            findMany: jest.fn(),
                            findUnique: jest.fn(),
                            findFirst: jest.fn(),
                            update: jest.fn(),
                            delete: jest.fn(),
                        },
                        scrapeJob: {
                            create: jest.fn(),
                        },
                    },
                },
                {
                    provide: EncryptionService,
                    useValue: {
                        encrypt: jest.fn().mockReturnValue('encrypted_pass'),
                        decrypt: jest.fn().mockReturnValue('decrypted_pass'),
                    },
                },
                {
                    provide: EmailService,
                    useValue: {
                        buildGeneralNotificationHtml: jest.fn().mockReturnValue('<html></html>'),
                        sendEmail: jest.fn().mockResolvedValue({}),
                    },
                },
                {
                    provide: 'SCRAPER_SERVICE',
                    useValue: {
                        emit: jest.fn(),
                    },
                },
            ],
        }).compile();

        service = module.get<ScraperService>(ScraperService);
        prisma = module.get<PrismaService>(PrismaService);
        encryptionService = module.get<EncryptionService>(EncryptionService);
        emailService = module.get<EmailService>(EmailService);
        clientProxy = module.get<ClientProxy>('SCRAPER_SERVICE');
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('createSite', () => {
        it('should create a site and send notifications', async () => {
            const userId = 'user-1';
            const dto = {
                name: 'Test Site',
                url: 'http://test.com',
                loginUrl: 'http://test.com/login',
                schedule: '0 8 * * *',
                platform: 'custom',
            };

            const user = { id: userId, email: 'user@test.com', name: 'Test User' };
            const site = { id: 'site-1', ...dto, userId, status: 'pending' };

            (prisma.user.findUnique as jest.Mock).mockResolvedValue(user);
            (prisma.scrapeSite.create as jest.Mock).mockResolvedValue(site);

            const result = await service.createSite(userId, dto);

            expect(prisma.scrapeSite.create).toHaveBeenCalled();
            expect(emailService.sendEmail).toHaveBeenCalled();
            expect(transporterMock.sendMail).toHaveBeenCalledWith(expect.objectContaining({
                to: process.env.SMTP_USER || 'support@stockbud.xyz',
                subject: expect.stringContaining('ACTION REQUIRED'),
            }));
            expect(result).toEqual(site);
        });
    });

    describe('verifySite', () => {
        it('should update site with credentials and trigger scrape', async () => {
            const siteId = 'site-1';
            const dto = { username: 'user', password: 'pass' };
            const site = { id: siteId, userId: 'user-1', url: 'http://test.com' };

            (prisma.scrapeSite.findUnique as jest.Mock).mockResolvedValue(site);
            (prisma.scrapeSite.update as jest.Mock).mockResolvedValue({ ...site, status: 'idle' });
            
            // Mock triggerScrape to avoid recursive testing of that method here
            jest.spyOn(service, 'triggerScrape').mockResolvedValue({ success: true, jobId: 'job-1' });

            const result = await service.verifySite(siteId, dto);

            expect(prisma.scrapeSite.update).toHaveBeenCalled();
            expect(encryptionService.encrypt).toHaveBeenCalledWith('pass');
            expect(service.triggerScrape).toHaveBeenCalled();
            expect(result.status).toBe('idle');
        });

        it('should throw NotFoundException if site not found', async () => {
            (prisma.scrapeSite.findUnique as jest.Mock).mockResolvedValue(null);

            await expect(service.verifySite('invalid', { username: 'u', password: 'p' }))
                .rejects.toThrow();
        });
    });

    describe('triggerScrape', () => {
        it('should create a job and emit scrape_request event', async () => {
            const userId = 'user-1';
            const siteId = 'site-1';
            const site = { 
                id: siteId, 
                userId, 
                url: 'http://test.com', 
                credentials: { username: 'u', password: 'encrypted_p' } 
            };
            const job = { id: 'job-1' };

            (prisma.scrapeSite.findFirst as jest.Mock).mockResolvedValue(site);
            (prisma.scrapeJob.create as jest.Mock).mockResolvedValue(job);

            const result = await service.triggerScrape(userId, siteId);

            expect(prisma.scrapeJob.create).toHaveBeenCalled();
            expect(encryptionService.decrypt).toHaveBeenCalledWith('encrypted_p');
            expect(clientProxy.emit).toHaveBeenCalledWith('scrape_request', expect.objectContaining({
                jobId: 'job-1',
                siteId: siteId,
                password: 'decrypted_pass'
            }));
            expect(result.success).toBe(true);
        });
    });

    describe('getUserSites', () => {
        it('should return sites for a user', async () => {
            const userId = 'user-1';
            const sites = [{ id: 'site-1' }];
            (prisma.scrapeSite.findMany as jest.Mock).mockResolvedValue(sites);

            const result = await service.getUserSites(userId);

            expect(prisma.scrapeSite.findMany).toHaveBeenCalledWith(expect.objectContaining({
                where: { userId }
            }));
            expect(result).toEqual(sites);
        });
    });

    describe('getSiteDetails', () => {
        it('should return site details', async () => {
            const userId = 'user-1';
            const siteId = 'site-1';
            const site = { id: siteId };
            (prisma.scrapeSite.findFirst as jest.Mock).mockResolvedValue(site);

            const result = await service.getSiteDetails(userId, siteId);

            expect(result).toEqual(site);
        });

        it('should throw NotFoundException if site not found', async () => {
            (prisma.scrapeSite.findFirst as jest.Mock).mockResolvedValue(null);
            await expect(service.getSiteDetails('u', 's')).rejects.toThrow();
        });
    });

    describe('deleteSite', () => {
        it('should delete a site', async () => {
            const userId = 'user-1';
            const siteId = 'site-1';
            (prisma.scrapeSite.findFirst as jest.Mock).mockResolvedValue({ id: siteId });
            (prisma.scrapeSite.delete as jest.Mock).mockResolvedValue({ id: siteId });

            const result = await service.deleteSite(userId, siteId);

            expect(prisma.scrapeSite.delete).toHaveBeenCalled();
            expect(result.id).toBe(siteId);
        });
    });
});
