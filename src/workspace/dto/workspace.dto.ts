import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsNotEmpty, IsOptional, IsString } from "class-validator";

export class WorkspaceCreateDTO {
    @ApiProperty({
        description: 'Nome do workspace',
        example: 'Meu Workspace'
    })
    @IsString()
    @IsNotEmpty()
    name: string;

    @ApiPropertyOptional({
        description: 'Descrição do workspace',
        example: 'Workspace para gerenciar projetos da empresa'
    })
    @IsString()
    @IsOptional()
    description?: string;
}