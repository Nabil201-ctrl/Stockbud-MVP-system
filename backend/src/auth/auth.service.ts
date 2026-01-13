import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
    private resetTokens = new Map<string, string>(); // Token -> Email

    constructor(
        private usersService: UsersService,
        private jwtService: JwtService,
    ) { }

    async validateUser(details: any) {
        // Find or create user based on Google profile
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

    async register(email: string, pass: string, name: string) {
        const hashedPassword = await bcrypt.hash(pass, 10);
        return this.usersService.createUser(email, name, hashedPassword);
    }

    async login(user: any) {
        const payload = { email: user.email, sub: user.id };
        const accessToken = this.jwtService.sign(payload, { expiresIn: '24h' });
        const refreshToken = this.jwtService.sign(payload, { expiresIn: '30d' });

        await this.usersService.setRefreshToken(user.id, refreshToken);

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
        if (!user) return { message: 'If email exists, reset info sent.' }; // Security: don't reveal existence

        // Generate token
        const token = Math.random().toString(36).substr(2, 12);
        this.resetTokens.set(token, email);

        // In a real app, send email via SendGrid/Resend
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
