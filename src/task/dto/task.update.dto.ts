import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsArray, IsDateString, IsEnum, IsOptional, IsString, IsUUID, ValidateNested } from "class-validator";
import { SubtaskDto } from "./subtask.dto";
import { TaskPriority } from "./task.create.dto";
import { Type } from "class-transformer";

export class UpdateTaskDto {
    @ApiPropertyOptional({
        description: 'Nome da tarefa',
        example: 'Criar tela de login atualizada',
    })
    @IsOptional()
    @IsString()
    name?: string;

    @ApiPropertyOptional({
        description: 'Descrição detalhada da tarefa',
        example: 'Implementar autenticação com JWT e OAuth',
    })
    @IsOptional()
    @IsString()
    description?: string;

    @ApiPropertyOptional({
        description: 'Array de subtarefas',
        type: [SubtaskDto],
    })
    @IsOptional()
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => SubtaskDto)
    subtask?: SubtaskDto[];

    @ApiPropertyOptional({
        description: 'ID da lista',
    })
    @IsOptional()
    @IsUUID()
    listId?: string;

    @ApiPropertyOptional({
        description: 'ID do status',
    })
    @IsOptional()
    @IsUUID()
    statusId?: string;

    @ApiPropertyOptional({
        description: 'Prioridade',
        enum: TaskPriority,
    })
    @IsOptional()
    @IsEnum(TaskPriority)
    priority?: TaskPriority;

    @ApiPropertyOptional({
        description: 'ID do responsável',
    })
    @IsOptional()
    @IsUUID()
    responsibleId?: string;

    @ApiPropertyOptional({
        description: 'Data de conclusão',
    })
    @IsOptional()
    @IsDateString()
    conclusion?: Date;
}