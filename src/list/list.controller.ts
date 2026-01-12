// src/list/list.controller.ts
import { Body, Controller, Delete, Get, Param, Post, Put, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam, ApiBody } from '@nestjs/swagger';
import { ListService } from './list.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { ProtectRoute } from '../auth/guards/protect-route-auth.guard';
import { ListCreateDto } from './dto/list.create.dto';
import { User } from '../../generated/prisma/browser';
import { ListUpdateDto } from './dto/list.update.dto';

@ApiTags('Lists')
@ApiBearerAuth('access-token')
@Controller('lists')
@UseGuards(ProtectRoute)
export class ListController {
    constructor(private readonly listService: ListService) {}

    @Post('project/:projectId')
    @ApiOperation({ summary: 'Criar nova lista em um projeto' })
    @ApiParam({ name: 'projectId', description: 'ID do projeto', type: String })
    @ApiBody({ type: ListCreateDto })
    @ApiResponse({ status: 201, description: 'Lista criada com sucesso' })
    @ApiResponse({ status: 400, description: 'Dados inválidos' })
    @ApiResponse({ status: 403, description: 'Sem acesso ao projeto' })
    async create(
        @Param('projectId') projectId: string,
        @Body() listCreateDto: ListCreateDto,
        @CurrentUser() user: User
    ) {
        return this.listService.create(projectId, listCreateDto, user);
    }

    @Get('project/:projectId')
    @ApiOperation({ summary: 'Listar todas as listas de um projeto' })
    @ApiParam({ name: 'projectId', description: 'ID do projeto', type: String })
    @ApiResponse({ status: 200, description: 'Lista de listas retornada' })
    @ApiResponse({ status: 403, description: 'Sem acesso ao projeto' })
    async findAll(
        @Param('projectId') projectId: string,
        @CurrentUser() user: User
    ) {
        return this.listService.findAll(projectId, user);
    }

    @Get(':id')
    @ApiOperation({ summary: 'Buscar lista por ID' })
    @ApiParam({ name: 'id', description: 'ID da lista', type: String })
    @ApiResponse({ status: 200, description: 'Lista encontrada' })
    @ApiResponse({ status: 404, description: 'Lista não encontrada' })
    async findOne(
        @Param('id') id: string,
        @CurrentUser() user: User
    ) {
        return this.listService.findOne(id, user);
    }

    @Put(':id')
    @ApiOperation({ summary: 'Atualizar lista' })
    @ApiParam({ name: 'id', description: 'ID da lista', type: String })
    @ApiBody({ type: ListUpdateDto })
    @ApiResponse({ status: 200, description: 'Lista atualizada' })
    @ApiResponse({ status: 403, description: 'Sem permissão' })
    @ApiResponse({ status: 404, description: 'Lista não encontrada' })
    async update(
        @Param('id') id: string,
        @Body() listUpdateDto: ListUpdateDto,
        @CurrentUser() user: User
    ) {
        return this.listService.update(id, listUpdateDto, user);
    }

    @Delete(':id')
    @ApiOperation({ summary: 'Deletar lista (apenas se estiver vazia)' })
    @ApiParam({ name: 'id', description: 'ID da lista', type: String })
    @ApiResponse({ status: 200, description: 'Lista deletada' })
    @ApiResponse({ status: 403, description: 'Sem permissão' })
    @ApiResponse({ status: 404, description: 'Lista não encontrada' })
    @ApiResponse({ status: 409, description: 'Lista contém tarefas' })
    async delete(
        @Param('id') id: string,
        @CurrentUser() user: User
    ) {
        return this.listService.delete(id, user);
    }

    @Delete(':id/force')
    @ApiOperation({ summary: 'Deletar lista e todas as tarefas (apenas owner do projeto)' })
    @ApiParam({ name: 'id', description: 'ID da lista', type: String })
    @ApiResponse({ status: 200, description: 'Lista e tarefas deletadas' })
    @ApiResponse({ status: 403, description: 'Sem permissão (apenas owner do projeto)' })
    @ApiResponse({ status: 404, description: 'Lista não encontrada' })
    async forceDelete(
        @Param('id') id: string,
        @CurrentUser() user: User
    ) {
        return this.listService.forceDelete(id, user);
    }

    @Post(':id/duplicate')
    @ApiOperation({ summary: 'Duplicar lista (sem as tarefas)' })
    @ApiParam({ name: 'id', description: 'ID da lista', type: String })
    @ApiResponse({ status: 201, description: 'Lista duplicada com sucesso' })
    @ApiResponse({ status: 403, description: 'Sem acesso' })
    @ApiResponse({ status: 404, description: 'Lista não encontrada' })
    async duplicate(
        @Param('id') id: string,
        @CurrentUser() user: User
    ) {
        return this.listService.duplicate(id, user);
    }
}