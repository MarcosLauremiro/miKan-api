import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsArray, IsBoolean, IsNotEmpty, IsOptional, IsString, ValidateNested } from "class-validator";
import { StatusProjectDto } from "./project.create.status.dto";
import { Type } from "class-transformer";

export class ProjectCreateDto {
    @ApiProperty({
        description: 'Nome do projeto',
        example: 'Projeto Alpha'
    })
    @IsString()
    @IsNotEmpty({ message: 'Nome do projeto é obrigatório' })
    name: string;

    @ApiPropertyOptional({
        description: 'Descrição do projeto',
        example: 'Projeto de desenvolvimento do sistema'
    })
    @IsString()
    @IsOptional()
    description?: string;

    @ApiProperty({
        description: 'Se o projeto é privado ou não',
        example: false
    })
    @IsBoolean()
    @IsNotEmpty({ message: 'Campo private é obrigatório' })
    private: boolean;

    @ApiPropertyOptional({
        description: 'Nome da lista inicial (padrão: "To Do")',
        example: 'Backlog'
    })
    @IsString()
    @IsOptional()
    initialListName?: string;

    @ApiPropertyOptional({
        description: 'Status personalizados do projeto',
        type: [StatusProjectDto],
        example: [
            { name: 'A Fazer', color: '#ef4444' },
            { name: 'Em Progresso', color: '#3b82f6' },
            { name: 'Concluído', color: '#10b981' }
        ]
    })
    @IsArray()
    @IsOptional()
    @ValidateNested({ each: true })
    @Type(() => StatusProjectDto)
    customStatus?: StatusProjectDto[];
}