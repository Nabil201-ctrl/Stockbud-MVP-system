import { IsString, IsOptional } from 'class-validator';

export class AddCredentialsDto {
    @IsString()
    @IsOptional()
    username?: string;

    @IsString()
    @IsOptional()
    password?: string;
}
