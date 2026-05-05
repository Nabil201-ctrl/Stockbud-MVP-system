import { IsString, IsUrl, IsOptional, IsBoolean } from 'class-validator';

export class CreateSiteDto {
    @IsString()
    name: string;

    @IsUrl()
    url: string;

    @IsUrl()
    @IsOptional()
    loginUrl?: string;

    @IsBoolean()
    @IsOptional()
    requiresLogin?: boolean;


    @IsString()
    @IsOptional()
    schedule?: string;

    @IsString()
    @IsOptional()
    platform?: string;

    @IsString()
    @IsOptional()
    targetStoreId?: string;

    @IsString()
    @IsOptional()
    targetStoreType?: string;
}
