import { IsString, IsUrl, IsOptional, IsBoolean } from 'class-validator';

export class CreateSiteDto {
    @IsString()
    name: string;

    @IsUrl()
    url: string;

    @IsUrl()
    @IsOptional()
    loginUrl?: string;

    @IsString()
    @IsOptional()
    username?: string;

    @IsString()
    @IsOptional()
    password?: string;

    @IsString()
    @IsOptional()
    schedule?: string;

    @IsString()
    @IsOptional()
    platform?: string;
}
