import { ExtractJwt, Strategy } from 'passport-jwt';
import * as fs from 'fs';
import * as path from 'path';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../users/users.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
    constructor(
        private configService: ConfigService,
        private usersService: UsersService,
    ) {
        super({
            jwtFromRequest: ExtractJwt.fromExtractors([
                (req) => {
                    let token = null;
                    if (req && req.cookies) {
                        token = req.cookies['access_token'];
                    }
                    if (!token) {
                        token = ExtractJwt.fromAuthHeaderAsBearerToken()(req);
                    }

                    const logLine = `[JWT Extractor] Token found: ${!!token}`;
                    fs.appendFileSync(path.join(__dirname, '..', '..', 'debug_auth.log'), `\n[${new Date().toISOString()}] ${logLine}`);
                    return token;
                },
            ]),                                                    
            ignoreExpiration: false,
            secretOrKey: configService.get<string>('JWT_SECRET') || 'secretKey',
        });
    }

    async validate(payload: any) {
        fs.appendFileSync(path.join(__dirname, '..', '..', 'debug_auth.log'), `\n[${new Date().toISOString()}] [JWT Validate] Payload: ${JSON.stringify(payload)}`);
        if (payload.sub === 'admin') {
            return {
                id: 'admin',
                email: process.env.ADMIN_EMAIL,
                name: 'Administrator',
                role: 'admin'
            };
        }
        const user = await this.usersService.findById(payload.sub);
        return user;
    }
}
