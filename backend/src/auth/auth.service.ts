import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import { NotificationsService } from '../notifications/notifications.service';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
    private resetTokens = new Map<string, string>();

    constructor(
        private usersService: UsersService,
        private jwtService: JwtService,
        private notificationsService: NotificationsService,
    ) { }

    async validateUser(details: any) {

        const user = await this.usersService.createOrFind(details);
        return user;
    }

    async validateUserLocal(email: string, pass: string): Promise<any> {
        const user = await this.usersService.findByEmail(email);
        if (user && user.password && await bcrypt.compare(pass, user.password)) {
            const { password, refreshToken, ...result } = user;
            return result;
        }
        return null;
    }

    async adminLogin(email: string, pass: string) {
        const adminEmail = process.env.ADMIN_EMAIL;
        const adminPass = process.env.ADMIN_PASSWORD;

        if (adminEmail && adminPass && email === adminEmail && pass === adminPass) {
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
            const accessToken = this.jwtService.sign(payload, { expiresIn: '12h' });
            return {
                access_token: accessToken,
                user
            };
        }
        throw new UnauthorizedException('Invalid admin credentials');
    }

    async register(email: string, pass: string, name: string, ip?: string) {
        const hashedPassword = await bcrypt.hash(pass, 12);
        const user = await this.usersService.createUser(email, name, hashedPassword);
        if (ip && user) {
            await this.usersService.fetchAndSetLocation(user.id, ip);
        }
        const { password, refreshToken, ...result } = user;
        return result;
    }

    async login(user: any, ip?: string) {
        const payload = { email: user.email, sub: user.id };
        const accessToken = this.jwtService.sign(payload, { expiresIn: '1h' });
        const refreshToken = this.jwtService.sign(payload, { expiresIn: '7d' });

        await this.usersService.setRefreshToken(user.id, refreshToken);

        const todayStr = new Date().toISOString().split('T')[0];
        const prevLoginDates = user.loginDates || [];
        await this.usersService.updateProfile(user.id, {
            signInCount: (user.signInCount || 0) + 1,
            lastLoginDate: new Date(),
            loginDates: [...prevLoginDates, todayStr],
        });

        if (ip) {
            await this.usersService.fetchAndSetLocation(user.id, ip);
        }

        const { password, refreshToken: storedRefreshToken, ...safeUser } = user;
        return {
            access_token: accessToken,
            refresh_token: refreshToken,
            user: safeUser,
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
            const accessToken = this.jwtService.sign(newPayload, { expiresIn: '1h' });
            const newRefreshToken = this.jwtService.sign(newPayload, { expiresIn: '7d' });

            await this.usersService.setRefreshToken(user.id, newRefreshToken);

            const { password, refreshToken: storedToken, ...safeUser } = user;
            return {
                access_token: accessToken,
                refresh_token: newRefreshToken,
                user: safeUser,
            };
        } catch (e) {
            throw new UnauthorizedException('Invalid refresh token session');
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

        const resetLink = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/auth/reset-password?token=${token}`;

        await this.notificationsService.sendEmail(
            email,
            'Password Reset Request - StockBud',
            `
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
                <h2 style="color: #2563eb;">Password Reset Request</h2>
                <p>Hello ${user.name || 'User'},</p>
                <p>We received a request to reset your StockBud password. Click the button below to choose a new password:</p>
                <div style="margin: 30px 0;">
                    <a href="${resetLink}" style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Reset Password</a>
                </div>
                <p>If you didn't request a password reset, you can safely ignore this email. The link will expire shortly.</p>
                <p>Thanks,<br>The StockBud Team</p>
            </div>
            `
        );

        console.log(`[DEV ONLY] Reset Email Sent. URL for ${email}: ${resetLink}`);

        return { message: 'Reset info sent.' };
    }

    async resetPassword(token: string, newPass: string) {
        const tokenDataStr = this.resetTokens.get(token);
        if (!tokenDataStr) throw new UnauthorizedException('Invalid or expired token');

        try {
            const { email, expiresAt } = JSON.parse(tokenDataStr);

            if (Date.now() > expiresAt) {
                this.resetTokens.delete(token);
                throw new UnauthorizedException('Token has expired');
            }

            const user = await this.usersService.findByEmail(email);
            if (!user) throw new UnauthorizedException('User no longer exists');

            const hashedPassword = await bcrypt.hash(newPass, 12);
            await this.usersService.updateProfile(user.id, { password: hashedPassword });

            this.resetTokens.delete(token);
            return { message: 'Password reset successful' };
        } catch (e) {
            if (e instanceof UnauthorizedException) throw e;
            throw new UnauthorizedException('Invalid token data');
        }
    }
}
