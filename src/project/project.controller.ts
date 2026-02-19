// src/project/project.controller.ts
import { Body, Controller, Delete, Get, Param, Post, Put, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam, ApiBody, ApiQuery } from '@nestjs/swagger';
import { ProjectService } from './project.service';
import { ProjectCreateDto } from './dto/project.create.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '../../generated/prisma/browser';
import { ProtectRoute } from '../auth/guards/protect-route-auth.guard';
import { ProjectUpdateDto } from './dto/project.update.dto';
import { StatusProjectDto } from './dto/project.create.status.dto';

@ApiTags('Projects')
@Controller('projects')
@ApiBearerAuth('access-token')
@UseGuards(ProtectRoute)
export class ProjectController {
    constructor(private readonly projectService: ProjectService) {}

    @Post(':workspaceId')
    @ApiOperation({ summary: 'Criar novo projeto' })
    @ApiParam({ name: 'workspaceId', description: 'ID do workspace', type: String })
    @ApiBody({ type: ProjectCreateDto })
    @ApiResponse({ status: 201, description: 'Projeto criado com sucesso' })
    @ApiResponse({ status: 400, description: 'Dados inválidos' })
    @ApiResponse({ status: 403, description: 'Sem acesso ao workspace' })
    async create(
        @Param('workspaceId') workspaceId: string,
        @Body() projectCreateDto: ProjectCreateDto,
        @CurrentUser() user: User
    ) {
        return this.projectService.create(projectCreateDto, user, workspaceId);
    }

    @Get('workspace/:workspaceId')
    @ApiOperation({ summary: 'Listar todos os projetos do usuário' })
    @ApiParam({ name: 'workspaceId', required: false, description: 'Filtrar por workspace' })
    @ApiResponse({ status: 200, description: 'Lista de projetos' })
    async findAll(
        @Param('workspaceId') workspaceId: string,
        @CurrentUser() user: User
    ) {
        return this.projectService.findAll(user, workspaceId);
    }

    @Get(':id')
    @ApiOperation({ summary: 'Buscar projeto por ID' })
    @ApiParam({ name: 'id', description: 'ID do projeto', type: String })
    @ApiResponse({ status: 200, description: 'Projeto encontrado' })
    @ApiResponse({ status: 404, description: 'Projeto não encontrado' })
    async findOne(
        @Param('id') id: string,
        @CurrentUser() user: User
    ) {
        return this.projectService.findOne(id, user);
    }

    @Put(':id')
    @ApiOperation({ summary: 'Atualizar projeto' })
    @ApiParam({ name: 'id', description: 'ID do projeto', type: String })
    @ApiBody({ type: ProjectUpdateDto })
    @ApiResponse({ status: 200, description: 'Projeto atualizado' })
    @ApiResponse({ status: 403, description: 'Sem permissão' })
    @ApiResponse({ status: 404, description: 'Projeto não encontrado' })
    async update(
        @Param('id') id: string,
        @Body() projectUpdateDto: ProjectUpdateDto,
        @CurrentUser() user: User
    ) {
        return this.projectService.update(id, projectUpdateDto, user);
    }

    @Delete(':id')
    @ApiOperation({ summary: 'Deletar projeto' })
    @ApiParam({ name: 'id', description: 'ID do projeto', type: String })
    @ApiResponse({ status: 200, description: 'Projeto deletado' })
    @ApiResponse({ status: 403, description: 'Sem permissão' })
    @ApiResponse({ status: 404, description: 'Projeto não encontrado' })
    async delete(
        @Param('id') id: string,
        @CurrentUser() user: User
    ) {
        return this.projectService.delete(id, user);
    }

    // Gerenciar status
    @Post(':projectId/status')
    @ApiOperation({ summary: 'Adicionar status ao projeto' })
    @ApiParam({ name: 'projectId', description: 'ID do projeto', type: String })
    @ApiBody({ type: StatusProjectDto })
    @ApiResponse({ status: 201, description: 'Status adicionado' })
    async addStatus(
        @Param('projectId') projectId: string,
        @Body() body: StatusProjectDto,
        @CurrentUser() user: User
    ) {
        return this.projectService.addStatus(projectId, body.name, body.color, user);
    }

    @Put('status/:statusId')
    @ApiOperation({ summary: 'Atualizar status' })
    @ApiParam({ name: 'statusId', description: 'ID do status', type: String })
    @ApiBody({ type: StatusProjectDto })
    @ApiResponse({ status: 200, description: 'Status atualizado' })
    async updateStatus(
        @Param('statusId') statusId: string,
        @Body() body: StatusProjectDto,
        @CurrentUser() user: User
    ) {
        return this.projectService.updateStatus(statusId, body.name, body.color, user);
    }

    @Delete('status/:statusId')
    @ApiOperation({ summary: 'Deletar status' })
    @ApiParam({ name: 'statusId', description: 'ID do status', type: String })
    @ApiResponse({ status: 200, description: 'Status deletado' })
    async deleteStatus(
        @Param('statusId') statusId: string,
        @CurrentUser() user: User
    ) {
        return this.projectService.deleteStatus(statusId, user);
    }
}