import { Test, TestingModule } from '@nestjs/testing';
import { MetricsService } from './metrics.service';
import { getToken } from '@willsoto/nestjs-prometheus';

describe('MetricsService', () => {
    let service: MetricsService;
    let counterMock: any;

    beforeEach(async () => {
        counterMock = {
            inc: jest.fn(),
        };

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                MetricsService,
                {
                    provide: getToken('backend_logs_total'),
                    useValue: counterMock,
                },
            ],
        }).compile();

        service = module.get<MetricsService>(MetricsService);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    it('should increment log counter', () => {
        service.recordLog('info');
        expect(counterMock.inc).toHaveBeenCalledWith({ level: 'info' });
    });
});
