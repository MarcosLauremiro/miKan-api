import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsString } from "class-validator";

export class AcceptInvitationDTO {
    @ApiProperty({
        description: 'Token do convite recebido por email',
        example: '1234567890-abc123'
    })
    @IsString()
    @IsNotEmpty({ message: 'Token é obrigatório' })
    token: string;
}

export class DeclineInvitationDTO {
    @ApiProperty({
        description: 'Token do convite recebido por email',
        example: '1234567890-abc123'
    })
    @IsString()
    @IsNotEmpty({ message: 'Token é obrigatório' })
    token: string;
}