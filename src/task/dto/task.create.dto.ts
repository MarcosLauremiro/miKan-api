// src/task/dto/task.dto.ts
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { 
    IsString, 
    IsOptional, 
    IsUUID, 
    IsDateString, 
    IsEnum, 
    IsArray, 
    ValidateNested,
    IsBoolean,
    IsNotEmpty
} from 'class-validator';
import { SubtaskDto } from './subtask.dto';

export enum TaskPriority {
    LOW = 'LOW',
    MEDIUM = 'MEDIUM',
    HIGH = 'HIGH',
    URGENT = 'URGENT'
}

export class CreateTaskDto {
    @ApiProperty({
        description: 'Nome da tarefa',
        example: 'Criar tela de login',
    })
    @IsString()
    @IsNotEmpty({ message: 'Nome da tarefa é obrigatório' })
    name: string;

    @ApiPropertyOptional({
        description: 'Descrição detalhada da tarefa',
        example: 'Implementar autenticação com JWT',
    })
    @IsOptional()
    @IsString()
    description?: string;

    @ApiPropertyOptional({
        description: 'Array de subtarefas',
        type: [SubtaskDto],
        example: [
            { title: 'Criar layout', done: false },
            { title: 'Integrar API', done: false },
        ],
    })
    @IsOptional()
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => SubtaskDto)
    subtask?: SubtaskDto[];

    @ApiPropertyOptional({
        description: 'ID da lista onde a tarefa está',
        example: 'b1d2f3a4-1111-2222-3333-444455556666',
    })
    @IsOptional()
    @IsUUID()
    listId?: string;

    @ApiProperty({
        description: 'ID do status da tarefa',
        example: 'status-em-andamento-id',
    })
    @IsUUID()
    @IsNotEmpty({ message: 'Status é obrigatório' })
    statusId: string;

    @ApiProperty({
        description: 'Prioridade da tarefa',
        example: 'HIGH',
        enum: TaskPriority,
    })
    @IsEnum(TaskPriority, { message: 'Prioridade deve ser LOW, MEDIUM, HIGH ou URGENT' })
    @IsNotEmpty({ message: 'Prioridade é obrigatória' })
    priority: TaskPriority;

    @ApiPropertyOptional({
        description: 'ID do responsável pela tarefa',
        example: 'user-responsavel-id',
    })
    @IsOptional()
    @IsUUID()
    responsibleId?: string;

    @ApiPropertyOptional({
        description: 'Data de conclusão da tarefa',
        example: '2026-01-31T18:00:00.000Z',
    })
    @IsOptional()
    @IsDateString()
    conclusion?: Date;
}

export class AssignResponsibleDto {
    @ApiProperty({
        description: 'ID do usuário responsável',
        example: 'user-id-123',
    })
    @IsUUID()
    @IsNotEmpty({ message: 'ID do responsável é obrigatório' })
    responsibleId: string;
}

export class AddCommentDto {
    @ApiProperty({
        description: 'Texto do comentário',
        example: 'Ótimo progresso na tarefa!',
    })
    @IsString()
    @IsNotEmpty({ message: 'Comentário não pode estar vazio' })
    comment: string;

    @ApiPropertyOptional({
        description: 'URL da mídia anexada',
        example: 'https://example.com/image.png',
    })
    @IsOptional()
    @IsString()
    midia?: string;
}

export class UpdateCommentDto {
    @ApiProperty({
        description: 'Texto do comentário atualizado',
        example: 'Comentário editado',
    })
    @IsString()
    @IsNotEmpty({ message: 'Comentário não pode estar vazio' })
    comment: string;

    @ApiPropertyOptional({
        description: 'URL da mídia anexada',
    })
    @IsOptional()
    @IsString()
    midia?: string;
}

export class MoveTaskDto {
    @ApiProperty({
        description: 'ID da nova lista',
        example: 'new-list-id',
    })
    @IsUUID()
    @IsNotEmpty({ message: 'ID da lista é obrigatório' })
    listId: string;
}

export class ChangeStatusDto {
    @ApiProperty({
        description: 'ID do novo status',
        example: 'status-concluido-id',
    })
    @IsUUID()
    @IsNotEmpty({ message: 'ID do status é obrigatório' })
    statusId: string;
}