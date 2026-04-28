import { Test, TestingModule } from '@nestjs/testing';
import { ScraperController } from './scraper.controller';
import { ScraperService } from './scraper.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

describe('ScraperController', () => {
    let controller: ScraperController;
    let service: ScraperService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            controllers: [ScraperController],
            providers: [
                {
                    provide: ScraperService,
                    useValue: {
                        createSite: jest.fn(),
                        getUserSites: jest.fn(),
                        getSiteDetails: jest.fn(),
                        verifySite: jest.fn(),
                        triggerScrape: jest.fn(),
                        deleteSite: jest.fn(),
                    },
                },
            ],
        })
        .overrideGuard(JwtAuthGuard)
        .useValue({ canActivate: () => true })
        .compile();

        controller = module.get<ScraperController>(ScraperController);
        service = module.get<ScraperService>(ScraperService);
    });

    it('should be defined', () => {
        expect(controller).toBeDefined();
    });

    describe('createSite', () => {
        it('should call service.createSite', async () => {
            const req = { user: { id: 'user-1' } };
            const dto = { name: 'Site', url: 'http://site.com', platform: 'custom' };
            await controller.createSite(req, dto as any);
            expect(service.createSite).toHaveBeenCalledWith('user-1', dto);
        });
    });

    describe('getSites', () => {
        it('should call service.getUserSites', async () => {
            const req = { user: { id: 'user-1' } };
            await controller.getSites(req);
            expect(service.getUserSites).toHaveBeenCalledWith('user-1');
        });
    });

    describe('getSite', () => {
        it('should call service.getSiteDetails', async () => {
            const req = { user: { id: 'user-1' } };
            await controller.getSite(req, 'site-1');
            expect(service.getSiteDetails).toHaveBeenCalledWith('user-1', 'site-1');
        });
    });

    describe('verifySite', () => {
        it('should call service.verifySite', async () => {
            const dto = { username: 'u', password: 'p' };
            await controller.verifySite('site-1', dto);
            expect(service.verifySite).toHaveBeenCalledWith('site-1', dto);
        });
    });

    describe('triggerScrape', () => {
        it('should call service.triggerScrape', async () => {
            const req = { user: { id: 'user-1' } };
            await controller.triggerScrape(req, 'site-1');
            expect(service.triggerScrape).toHaveBeenCalledWith('user-1', 'site-1');
        });
    });

    describe('deleteSite', () => {
        it('should call service.deleteSite', async () => {
            const req = { user: { id: 'user-1' } };
            await controller.deleteSite(req, 'site-1');
            expect(service.deleteSite).toHaveBeenCalledWith('user-1', 'site-1');
        });
    });
});
