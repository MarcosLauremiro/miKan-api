import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class ListCreateDto {
    @ApiProperty({
        description: 'Nome da lista',
        example: 'Backlog'
    })
    @IsString()
    @IsNotEmpty({ message: 'Nome da lista é obrigatório' })
    name: string;
}