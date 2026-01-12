import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsBoolean, IsOptional, IsString } from "class-validator";

export class ProjectUpdateDto {
    @ApiPropertyOptional({
        description: 'Nome do projeto',
        example: 'Projeto Beta'
    })
    @IsString()
    @IsOptional()
    name?: string;

    @ApiPropertyOptional({
        description: 'Se o projeto é privado ou não',
        example: true
    })
    @IsBoolean()
    @IsOptional()
    private?: boolean;
}