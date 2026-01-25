import { IsString, IsNotEmpty } from 'class-validator';

export class ConnectWithCodeDto {
    @IsString()
    @IsNotEmpty()
    code: string;

    @IsString()
    @IsNotEmpty()
    shop: string;

    @IsString()
    @IsNotEmpty()
    accessToken: string;
}
