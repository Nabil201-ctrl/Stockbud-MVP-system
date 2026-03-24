import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
    private resetTokens = new Map<string, string>(); 

    constructor(
        private usersService: UsersService,
        private jwtService: JwtService,
    ) { }

    async validateUser(details: any) {
        
        const user = await this.usersService.createOrFind(details);
        return user;
    }

    async validateUserLocal(email: string, pass: string): Promise<any> {
        const user = await this.usersService.findByEmail(email);
        if (user && user.password && await bcrypt.compare(pass, user.password)) {
            const { password, ...result } = user;
            return result;
        }
        return null;
    }

    async adminLogin(email: string, pass: string) {
        const adminEmail = process.env.ADMIN_EMAIL;
        const adminPass = process.env.ADMIN_PASSWORD;

        console.log('--- Admin Login Debug ---');
        console.log(`Received: [${email}] / [${pass}]`);
        console.log(`Expected: [${adminEmail}] / [${adminPass}]`);
        console.log(`Match Email: ${email === adminEmail}`);
        console.log(`Match Pass: ${pass === adminPass}`);

        if (email === adminEmail && pass === adminPass) {
            const user = {
                id: 'admin',
                email: adminEmail,
                name: 'Administrator',
                role: 'admin'
            };
            const payload = {
                email: adminEmail,
                sub: 'admin', 
                role: 'admin',
                name: 'Administrator'
            };
            const accessToken = this.jwtService.sign(payload, { expiresIn: '24h' });
            return {
                access_token: accessToken,
                user
            };
        }
        throw new UnauthorizedException('Invalid admin credentials');
    }

    async register(email: string, pass: string, name: string, ip?: string) {
        const hashedPassword = await bcrypt.hash(pass, 10);
        const user = await this.usersService.createUser(email, name, hashedPassword);
        if (ip && user) {
            await this.usersService.fetchAndSetLocation(user.id, ip);
        }
        return user;
    }

    async login(user: any, ip?: string) {
        const payload = { email: user.email, sub: user.id };
        const accessToken = this.jwtService.sign(payload, { expiresIn: '24h' });
        const refreshToken = this.jwtService.sign(payload, { expiresIn: '30d' });

        await this.usersService.setRefreshToken(user.id, refreshToken);

        const todayStr = new Date().toISOString().split('T')[0];
        const prevLoginDates = user.loginDates || [];
        await this.usersService.updateProfile(user.id, {
            signInCount: (user.signInCount || 0) + 1,
            lastLoginDate: new Date().toISOString(),
            loginDates: [...prevLoginDates, todayStr],
        });

        if (ip) {
            await this.usersService.fetchAndSetLocation(user.id, ip);
        }

        return {
            access_token: accessToken,
            refresh_token: refreshToken,
            user,
        };
    }

    async refreshTokens(refreshToken: string) {
        try {
            const payload = this.jwtService.verify(refreshToken);
            const user = await this.usersService.findById(payload.sub);

            if (!user || !user.refreshToken || user.refreshToken !== refreshToken) {
                throw new UnauthorizedException('Invalid refresh token');
            }

            const newPayload = { email: user.email, sub: user.id };
            const accessToken = this.jwtService.sign(newPayload, { expiresIn: '24h' });
            const newRefreshToken = this.jwtService.sign(newPayload, { expiresIn: '30d' });

            await this.usersService.setRefreshToken(user.id, newRefreshToken);

            return {
                access_token: accessToken,
                refresh_token: newRefreshToken,
                user,
            };
        } catch (e) {
            throw new UnauthorizedException('Invalid refresh token');
        }
    }

    async changePassword(userId: string, oldPass: string, newPass: string) {
        const user = await this.usersService.findById(userId);
        if (!user || !user.password) throw new UnauthorizedException('User not found or no password set');

        const isMatch = await bcrypt.compare(oldPass, user.password);
        if (!isMatch) throw new UnauthorizedException('Invalid current password');

        const hashedPassword = await bcrypt.hash(newPass, 10);
        return this.usersService.updateProfile(userId, { password: hashedPassword });
    }

    async forgotPassword(email: string) {
        const user = await this.usersService.findByEmail(email);
        if (!user) return { message: 'If email exists, reset info sent.' }; 

        
        const token = Math.random().toString(36).substr(2, 12);
        this.resetTokens.set(token, email);

        
        console.log(`[DEV ONLY] Reset Token for ${email}: ${token}`);

        return { message: 'Reset info sent (check console)' };
    }

    async resetPassword(token: string, newPass: string) {
        const email = this.resetTokens.get(token);
        if (!email) throw new UnauthorizedException('Invalid or expired token');

        const user = await this.usersService.findByEmail(email);
        if (!user) throw new UnauthorizedException('User not found');

        const hashedPassword = await bcrypt.hash(newPass, 10);
        await this.usersService.updateProfile(user.id, { password: hashedPassword });

        this.resetTokens.delete(token);
        return { message: 'Password reset successful' };
    }
}
