import { ApiProperty } from "@nestjs/swagger";
import { IsEnum, IsNotEmpty, IsString } from "class-validator";

export class UpdateMemberRoleDTO {
    @ApiProperty({
        description: 'Novo role do membro',
        enum: ['OWNER', 'ADMIN', 'MEMBER'],
        example: 'ADMIN'
    })
    @IsString()
    @IsEnum(['OWNER', 'ADMIN', 'MEMBER'], {
        message: 'Role deve ser OWNER, ADMIN ou MEMBER'
    })
    @IsNotEmpty({ message: 'Role é obrigatório' })
    role: string;
}