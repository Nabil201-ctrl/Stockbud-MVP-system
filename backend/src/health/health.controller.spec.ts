import { Test, TestingModule } from '@nestjs/testing';
import { HealthController } from './health.controller';
import { HealthCheckService, MicroserviceHealthIndicator, MemoryHealthIndicator, DiskHealthIndicator } from '@nestjs/terminus';

describe('HealthController', () => {
    let controller: HealthController;
    let health: HealthCheckService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            controllers: [HealthController],
            providers: [
                {
                    provide: HealthCheckService,
                    useValue: {
                        check: jest.fn().mockImplementation((checks) => Promise.all(checks.map(c => c()))),
                    },
                },
                {
                    provide: MicroserviceHealthIndicator,
                    useValue: {
                        pingCheck: jest.fn().mockResolvedValue({ rabbitmq: { status: 'up' } }),
                    },
                },
                {
                    provide: MemoryHealthIndicator,
                    useValue: {
                        checkHeap: jest.fn().mockResolvedValue({ memory_heap: { status: 'up' } }),
                        checkRSS: jest.fn().mockResolvedValue({ memory_rss: { status: 'up' } }),
                    },
                },
                {
                    provide: DiskHealthIndicator,
                    useValue: {
                        checkStorage: jest.fn().mockResolvedValue({ storage: { status: 'up' } }),
                    },
                },
            ],
        }).compile();

        controller = module.get<HealthController>(HealthController);
        health = module.get<HealthCheckService>(HealthCheckService);
    });

    it('should be defined', () => {
        expect(controller).toBeDefined();
    });

    it('should run all health checks', async () => {
        const result = await controller.check();
        expect(health.check).toHaveBeenCalled();
        expect(result).toBeDefined();
    });
});
