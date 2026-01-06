import { ApiProperty } from "@nestjs/swagger";
import { IsEmail, IsEnum, IsNotEmpty, IsString } from "class-validator";

export class AddMemberDTO {
    @ApiProperty({
        description: 'Email do usuário a ser adicionado',
        example: 'user@example.com'
    })
    @IsEmail({}, { message: 'Email inválido' })
    @IsNotEmpty({ message: 'Email é obrigatório' })
    email: string;

    @ApiProperty({
        description: 'Role do membro no workspace',
        enum: ['OWNER', 'ADMIN', 'MEMBER'],
        example: 'MEMBER'
    })
    @IsString()
    @IsEnum(['OWNER', 'ADMIN', 'MEMBER'], {
        message: 'Role deve ser OWNER, ADMIN ou MEMBER'
    })
    @IsNotEmpty({ message: 'Role é obrigatório' })
    role: string;
}