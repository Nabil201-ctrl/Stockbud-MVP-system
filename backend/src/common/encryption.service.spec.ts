import { Test, TestingModule } from '@nestjs/testing';
import { EncryptionService } from './encryption.service';
import { ConfigService } from '@nestjs/config';

describe('EncryptionService', () => {
    let service: EncryptionService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                EncryptionService,
                {
                    provide: ConfigService,
                    useValue: {
                        get: jest.fn().mockReturnValue('12345678901234567890123456789012'),
                    },
                },
            ],
        }).compile();

        service = module.get<EncryptionService>(EncryptionService);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    it('should encrypt and decrypt correctly', () => {
        const originalText = 'secret-password';
        const encrypted = service.encrypt(originalText);
        expect(encrypted).not.toBe(originalText);
        expect(encrypted).toContain(':');

        const decrypted = service.decrypt(encrypted);
        expect(decrypted).toBe(originalText);
    });

    it('should produce different ciphertexts for the same plaintext (due to IV)', () => {
        const text = 'same-text';
        const encrypted1 = service.encrypt(text);
        const encrypted2 = service.encrypt(text);
        expect(encrypted1).not.toBe(encrypted2);
    });
});
