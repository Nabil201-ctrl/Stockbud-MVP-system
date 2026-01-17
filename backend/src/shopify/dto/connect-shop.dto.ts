import { IsString, IsNotEmpty, Matches, IsEmail, IsOptional } from 'class-validator';

export class ConnectShopDto {
    @IsString()
    @IsNotEmpty()
    @Matches(/^[a-zA-Z0-9-]+\.myshopify\.com$/, {
        message: 'Shop must be a valid myshopify.com domain',
    })
    shop: string;

    @IsString()
    @IsNotEmpty()
    accessToken: string;

    @IsOptional()
    @IsEmail()
    email?: string;

    @IsOptional()
    @IsString()
    name?: string;
}
