import { IsEmail, IsNotEmpty, IsString } from "class-validator"

import { ApiProperty } from '@nestjs/swagger';

export class RegisterDTO {

    @ApiProperty({
        example: "Exemple",
    })
    @IsString()
    name: string

    @ApiProperty({
        example: "example@gmail.com",
    })
    @IsEmail()
    email: string

    @ApiProperty({
        example: "12345678",
    })
    @IsNotEmpty()
    password: string
}