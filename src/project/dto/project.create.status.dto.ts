import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsString } from "class-validator";

export class StatusProjectDto {
    @ApiProperty({
        description: 'Nome do status',
        example: 'Em Progresso'
    })
    @IsString()
    @IsNotEmpty()
    name: string;

    @ApiProperty({
        description: 'Cor do status em hexadecimal',
        example: '#3b82f6'
    })
    @IsString()
    @IsNotEmpty()
    color: string;
}
