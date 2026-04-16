import { Controller, Get, Post, Body, Req, UseGuards, Res, UnauthorizedException, Query } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { AuthGuard } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { Response } from 'express';
import { ConfigService } from '@nestjs/config';
import { RegisterDto, LoginDto, ChangePasswordDto, ForgotPasswordDto, ResetPasswordDto } from './dto/auth.dto';

@Controller('auth')
export class AuthController {
    constructor(
        private authService: AuthService,
        private configService: ConfigService
    ) { }

    @Get('google')
    @UseGuards(AuthGuard('google'))
    async googleAuth(@Req() req) { }

    @Get('google/callback')
    @UseGuards(AuthGuard('google'))
    async googleAuthRedirect(@Req() req, @Res() res: Response) {
        let ip = req.headers['x-forwarded-for'] || req.connection?.remoteAddress || req.ip;
        if (Array.isArray(ip)) ip = ip[0];

        const { access_token, refresh_token } = await this.authService.login(req.user, ip);


        res.cookie('access_token', access_token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 15 * 60 * 1000
        });

        res.cookie('refresh_token', refresh_token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 7 * 24 * 60 * 60 * 1000
        });

        const frontendUrl = this.configService.get<string>('FRONTEND_URL') || 'https://stockbud.xyz';
        res.redirect(`${frontendUrl}/auth/success?login_success=true`);
    }

    @Post('refresh')
    async refresh(@Req() req, @Res({ passthrough: true }) res: Response) {
        const refreshToken = req.cookies['refresh_token'];
        if (!refreshToken) throw new UnauthorizedException('No Refresh Token');

        const { access_token, refresh_token: newRefreshToken, user } = await this.authService.refreshTokens(refreshToken);

        res.cookie('access_token', access_token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 15 * 60 * 1000
        });

        res.cookie('refresh_token', newRefreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 7 * 24 * 60 * 60 * 1000
        });

        return { user, access_token };
    }

    @Throttle({ default: { limit: 5, ttl: 60000 } })
    @Post('admin/login')
    async adminLogin(@Body() body: LoginDto, @Res({ passthrough: true }) res: Response) {
        const { access_token, user } = await this.authService.adminLogin(body.email, body.password);

        res.cookie('access_token', access_token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 24 * 60 * 60 * 1000
        });

        return { user, access_token };
    }

    @Throttle({ default: { limit: 5, ttl: 60000 } })
    @UseGuards(AuthGuard('local'))
    @Post('login')
    async login(@Req() req, @Res({ passthrough: true }) res: Response) {
        let ip = req.headers['x-forwarded-for'] || req.connection?.remoteAddress || req.ip;
        if (Array.isArray(ip)) ip = ip[0];
        const { access_token, refresh_token, user } = await this.authService.login(req.user, ip);

        res.cookie('access_token', access_token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 15 * 60 * 1000
        });

        res.cookie('refresh_token', refresh_token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 7 * 24 * 60 * 60 * 1000
        });

        return { user, access_token, refresh_token };
    }

    @Post('logout')
    async logout(@Res({ passthrough: true }) res: Response) {
        res.clearCookie('access_token');
        res.clearCookie('refresh_token');
        return { message: 'Logged out' };
    }

    @Get('me')
    @UseGuards(AuthGuard('jwt'))
    async getProfile(@Req() req) {
        return req.user;
    }

    @Throttle({ default: { limit: 3, ttl: 60000 } })
    @Post('register')
    async register(@Req() req, @Body() body: RegisterDto, @Res({ passthrough: true }) res: Response) {
        let ip = req.headers['x-forwarded-for'] || req.connection?.remoteAddress || req.ip;
        if (Array.isArray(ip)) ip = ip[0];

        const user = await this.authService.register(body.email, body.password, body.name, ip);

        const { access_token, refresh_token, user: loggedInUser } = await this.authService.login(user, ip);

        res.cookie('access_token', access_token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 15 * 60 * 1000
        });

        res.cookie('refresh_token', refresh_token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 7 * 24 * 60 * 60 * 1000
        });

        return { user: loggedInUser, access_token, refresh_token };
    }


    @Post('change-password')
    @UseGuards(AuthGuard('jwt'))
    async changePassword(@Req() req, @Body() body: ChangePasswordDto) {
        return this.authService.changePassword(req.user.id, body.oldPassword, body.newPassword);
    }

    @Post('forgot-password')
    async forgotPassword(@Body() body: ForgotPasswordDto) {
        return this.authService.forgotPassword(body.email);
    }

    @Post('reset-password')
    async resetPassword(@Body() body: ResetPasswordDto) {
        return this.authService.resetPassword(body.token, body.newPassword);
    }

    @Get('verify')
    async verifyEmail(@Query('token') token: string) {
        return this.authService.verifyEmail(token);
    }
}

