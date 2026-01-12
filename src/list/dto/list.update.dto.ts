import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsOptional, IsString } from "class-validator";


export class ListUpdateDto {
    @ApiPropertyOptional({
        description: 'Nome da lista',
        example: 'Em Progresso'
    })
    @IsString()
    @IsOptional()
    name?: string;
}
