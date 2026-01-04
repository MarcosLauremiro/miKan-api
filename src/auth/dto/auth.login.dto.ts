import { ApiProperty } from "@nestjs/swagger"
import { IsEmail, IsNotEmpty } from "class-validator"

export class LoginDTO {
    @ApiProperty({
        example:"example@gmail.com"
    })
    @IsEmail()
    email: string

    @ApiProperty({
        example:"12345678"
    })
    @IsNotEmpty()
    password: string
}