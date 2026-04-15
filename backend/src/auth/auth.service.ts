import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import { NotificationsService } from '../notifications/notifications.service';
import * as bcrypt from 'bcrypt';
import { EmailService } from '../email/email.service';

@Injectable()
export class AuthService {
    private resetTokens = new Map<string, string>();

    constructor(
        private usersService: UsersService,
        private jwtService: JwtService,
        private notificationsService: NotificationsService,
        private emailService: EmailService,
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
        const verificationToken = Math.random().toString(36).substr(2, 15);
        const user = await this.usersService.createUser(email, name, hashedPassword, false, verificationToken);

        if (ip && user) {
            await this.usersService.fetchAndSetLocation(user.id, ip);
        }

        // Send Welcome & Verification Email via Brevo
        if (user) {
            await this.emailService.sendAccountVerificationEmail(user.email, user.name || 'User', verificationToken);
            await this.emailService.sendWelcomeEmail(user.email, user.name || 'User');
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
        if (!user) throw new UnauthorizedException('User not found');

        // Allow bypassing old password check if the user is required to set their initial password
        if (!user.requiresPasswordChange) {
            if (!user.password) throw new UnauthorizedException('No password set and not in password-change mode');
            const isMatch = await bcrypt.compare(oldPass, user.password);
            if (!isMatch) throw new UnauthorizedException('Invalid current password');
        }

        const hashedPassword = await bcrypt.hash(newPass, 10);
        return this.usersService.updateProfile(userId, {
            password: hashedPassword,
            requiresPasswordChange: false
        });
    }


    async forgotPassword(email: string) {
        const user = await this.usersService.findByEmail(email);
        if (!user) return { message: 'If email exists, reset info sent.' };

        const token = Math.random().toString(36).substr(2, 12);
        this.resetTokens.set(token, JSON.stringify({ email, expiresAt: Date.now() + 3600000 }));

        const resetLink = `${process.env.FRONTEND_URL || 'https://stockbud.xyz'}/auth/reset-password?token=${token}`;

        await this.emailService.sendPasswordResetEmail(
            user.email,
            user.name || 'User',
            resetLink
        );

        console.log(`[DEV ONLY] Reset Email Sent. URL for ${email}: ${resetLink}`);

        return { message: 'Password reset instructions have been dispatched to your email address.' };
    }

    async resetPassword(token: string, newPass: string) {
        const tokenDataStr = this.resetTokens.get(token);
        if (!tokenDataStr) throw new UnauthorizedException('Invalid or expired token');

        try {
            let email: string;
            let expiresAt: number;

            try {
                // Try parsing as JSON first (new format)
                const data = JSON.parse(tokenDataStr);
                email = data.email;
                expiresAt = data.expiresAt;
            } catch (e) {
                // Fallback for old format if any (just the email string)
                email = tokenDataStr;
                expiresAt = Date.now() + 3600000; // Assume not expired
            }

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

    async verifyEmail(token: string) {
        const users = await this.usersService.getAllUsers();
        const user = users.find(u => (u as any).verificationToken === token);

        if (!user) throw new UnauthorizedException('Invalid or expired verification token');

        await this.usersService.updateProfile(user.id, {
            isVerified: true,
            verificationToken: null
        } as any);

        return { message: 'Account verified successfully', email: user.email };
    }
}

