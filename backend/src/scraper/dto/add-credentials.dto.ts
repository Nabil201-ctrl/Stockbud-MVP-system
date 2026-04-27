import { IsString, IsNotEmpty } from 'class-validator';

export class AddCredentialsDto {
    @IsString()
    @IsNotEmpty()
    username: string;

    @IsString()
    @IsNotEmpty()
    password: string;
}
