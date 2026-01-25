import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class ApiKeyGuard implements CanActivate {
    constructor(private readonly configService: ConfigService) { }

    canActivate(context: ExecutionContext): boolean {
        const request = context.switchToHttp().getRequest();
        const apiKey = request.headers['x-internal-api-key'];
        const validApiKey = this.configService.get<string>('INTERNAL_API_KEY');

        if (!validApiKey) {
            console.error('INTERNAL_API_KEY is not configured in environment variables');
            return false;
        }

        if (apiKey && apiKey === validApiKey) {
            return true;
        }

        throw new UnauthorizedException('Invalid API Key');
    }
}
