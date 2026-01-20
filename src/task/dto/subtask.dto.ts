import { ApiProperty } from "@nestjs/swagger"
import { IsBoolean, IsNotEmpty, IsString } from "class-validator"

export class SubtaskDto {
    @ApiProperty({
        description: 'Título da subtarefa',
        example: 'Criar layout'
    })
    @IsString()
    @IsNotEmpty()
    title: string;

    @ApiProperty({
        description: 'Status de conclusão',
        example: false
    })
    @IsBoolean()
    done: boolean;
}