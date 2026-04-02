import { IsString, IsOptional, IsEmail, IsBoolean } from 'class-validator';

export class UpdateUserDto {
    @IsString()
    @IsOptional()
    name?: string;

    @IsEmail()
    @IsOptional()
    email?: string;

    @IsString()
    @IsOptional()
    language?: string;

    @IsString()
    @IsOptional()
    currency?: string;

    @IsBoolean()
    @IsOptional()
    isOnboardingComplete?: boolean;
}
