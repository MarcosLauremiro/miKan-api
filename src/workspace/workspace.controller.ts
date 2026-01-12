import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Post, Put, UseGuards } from "@nestjs/common";
import { WorkspaceService } from "./workspace.service";
import { WorkspaceCreateDTO } from "./dto/workspace.dto";
import { ProtectRoute } from "../auth/guards/protect-route-auth.guard";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { ApiBearerAuth, ApiBody, ApiOperation, ApiParam, ApiQuery, ApiResponse, ApiTags } from "@nestjs/swagger";
import { AddMemberDTO } from "./dto/workspace.addMember.dto";
import { UpdateMemberRoleDTO } from "./dto/workspace.update.member.dto";
import { User } from "../../generated/prisma/browser";


@ApiTags('Workspace')
@ApiBearerAuth()
@Controller('workspace')
@ApiBearerAuth('access-token')
@UseGuards(ProtectRoute)
export class WrokspaceController {
    constructor(
        private readonly workspaceService: WorkspaceService
    ) { }

    @Post()
    @ApiOperation({ summary: 'Criar novo workspace' })
    @ApiResponse({ status: 201, description: 'Workspace criado com sucesso' })
    @ApiResponse({ status: 400, description: 'Dados inválidos' })
    @ApiResponse({ status: 401, description: 'Não autorizado' })
    async createWorkspace(
        @Body() workspaceDTO: WorkspaceCreateDTO,
        @CurrentUser() user: User
    ) {
        return this.workspaceService.createWorkspace(workspaceDTO, user);
    }


    @Get()
    @ApiOperation({ summary: 'Listar todos os workspaces do usuário' })
    @ApiResponse({ status: 200, description: 'Lista de workspaces retornada com sucesso' })
    @ApiResponse({ status: 401, description: 'Não autorizado' })
    async readWorkspaces(@CurrentUser() user: User) {
        return this.workspaceService.readWorkspaces(user);
    }

    @Get(':id')
    @ApiOperation({ summary: 'Buscar workspace por ID' })
    @ApiParam({ name: 'id', description: 'ID do workspace', type: String })
    @ApiResponse({ status: 200, description: 'Workspace encontrado' })
    @ApiResponse({ status: 404, description: 'Workspace não encontrado' })
    @ApiResponse({ status: 401, description: 'Não autorizado' })
    async readWorkspaceById(
        @Param('id') id: string,
        @CurrentUser() user: User
    ) {
        return this.workspaceService.readWorkspaceById(id, user);
    }

    @Delete(':id')
    @ApiOperation({ summary: 'Deletar workspace' })
    @ApiParam({ name: 'id', description: 'ID do workspace', type: String })
    @ApiResponse({ status: 200, description: 'Workspace deletado com sucesso' })
    @ApiResponse({ status: 403, description: 'Sem permissão para deletar' })
    @ApiResponse({ status: 404, description: 'Workspace não encontrado' })
    @ApiResponse({ status: 401, description: 'Não autorizado' })
    async deleteWorkspace(
        @Param('id') id: string,
        @CurrentUser() user: User
    ) {
        return this.workspaceService.deleteWorkspace(id, user);
    }

    @Post(':id/members')
    @ApiOperation({ summary: 'Adicionar membro ao workspace' })
    @ApiParam({ name: 'id', description: 'ID do workspace', type: String })
    @ApiBody({ type: AddMemberDTO })
    @ApiResponse({
        status: 201,
        description: 'Membro adicionado com sucesso ou convite enviado',
        schema: {
            example: {
                message: 'Membro adicionado ao workspace',
                type: 'ADDED'
            }
        }
    })
    @ApiResponse({ status: 400, description: 'Dados inválidos' })
    @ApiResponse({ status: 403, description: 'Sem permissão para adicionar membros' })
    @ApiResponse({ status: 404, description: 'Workspace não encontrado' })
    @ApiResponse({ status: 409, description: 'Usuário já é membro ou convite pendente existe' })
    @ApiResponse({ status: 401, description: 'Não autorizado' })
    async addMemberToWorkspace(
        @Param('id') id: string,
        @Body() body: AddMemberDTO,
        @CurrentUser() user: User
    ) {
        return this.workspaceService.addMemberToWorkspace(
            id,
            body.email,
            body.role,
            user
        );
    }

    @Put(':id/members/:memberId')
    @ApiOperation({ summary: 'Atualizar role de um membro' })
    @ApiParam({ name: 'id', description: 'ID do workspace', type: String })
    @ApiParam({ name: 'memberId', description: 'ID do membro', type: String })
    @ApiBody({ type: UpdateMemberRoleDTO })
    @ApiResponse({ status: 200, description: 'Role atualizado com sucesso' })
    @ApiResponse({ status: 400, description: 'Dados inválidos' })
    @ApiResponse({ status: 403, description: 'Sem permissão para atualizar membros' })
    @ApiResponse({ status: 404, description: 'Workspace ou membro não encontrado' })
    @ApiResponse({ status: 409, description: 'Não pode remover o último OWNER' })
    async updateMemberRole(
        @Param('id') workspaceId: string,
        @Param('memberId') memberId: string,
        @Body() body: UpdateMemberRoleDTO,
        @CurrentUser() user: User
    ) {
        return this.workspaceService.updateMemberRole(
            workspaceId,
            memberId,
            body.role,
            user
        );
    }

    @Delete(':id/members/:memberId')
    @ApiOperation({ summary: 'Remover membro do workspace' })
    @ApiParam({ name: 'id', description: 'ID do workspace', type: String })
    @ApiParam({ name: 'memberId', description: 'ID do membro a ser removido', type: String })
    @ApiResponse({ status: 200, description: 'Membro removido com sucesso' })
    @ApiResponse({ status: 403, description: 'Sem permissão para remover membros' })
    @ApiResponse({ status: 404, description: 'Workspace ou membro não encontrado' })
    @ApiResponse({ status: 409, description: 'Não pode remover o último OWNER' })
    async removeMemberFromWorkspace(
        @Param('id') workspaceId: string,
        @Param('memberId') memberId: string,
        @CurrentUser() user: User
    ) {
        return this.workspaceService.removeMemberFromWorkspace(
            workspaceId,
            memberId,
            user
        );
    }

    @Post(':id/leave')
    @ApiOperation({ summary: 'Sair do workspace (remover a si mesmo)' })
    @ApiParam({ name: 'id', description: 'ID do workspace', type: String })
    @ApiResponse({ status: 200, description: 'Você saiu do workspace com sucesso' })
    @ApiResponse({ status: 404, description: 'Você não é membro deste workspace' })
    @ApiResponse({ status: 409, description: 'Você é o último OWNER, não pode sair' })
    async leaveWorkspace(
        @Param('id') workspaceId: string,
        @CurrentUser() user: User
    ) {
        return this.workspaceService.leaveWorkspace(workspaceId, user);
    }

    @Post('accept-invite')
    @ApiOperation({ summary: 'Aceitar convite para workspace' })
    @ApiBody({
        schema: {
            type: 'object',
            properties: {
                token: {
                    type: 'string',
                    description: 'Token do convite recebido por email'
                }
            },
            required: ['token']
        }
    })
    @ApiResponse({
        status: 200,
        description: 'Convite aceito com sucesso',
        schema: {
            example: {
                message: 'Convite aceito com sucesso! Bem-vindo ao workspace.',
                data: {
                    id: 'uuid',
                    workspaceId: 'uuid',
                    userId: 'uuid',
                    role: 'MEMBER',
                    workspace: {
                        id: 'uuid',
                        name: 'Meu Workspace'
                    }
                }
            }
        }
    })
    @ApiResponse({ status: 400, description: 'Token inválido' })
    @ApiResponse({ status: 403, description: 'Email não corresponde ao convite' })
    @ApiResponse({ status: 404, description: 'Convite não encontrado' })
    @ApiResponse({ status: 409, description: 'Já é membro do workspace' })
    @ApiResponse({ status: 410, description: 'Convite expirado' })
    async acceptInvitation(
        @Body() body: { token: string },
        @CurrentUser() user: User
    ) {
        return this.workspaceService.acceptInvitation(body.token, user);
    }

    @Post('decline-invite')
    @ApiOperation({ summary: 'Recusar convite para workspace' })
    @ApiBody({
        schema: {
            type: 'object',
            properties: {
                token: {
                    type: 'string',
                    description: 'Token do convite recebido por email'
                }
            },
            required: ['token']
        }
    })
    @ApiResponse({ status: 200, description: 'Convite recusado com sucesso' })
    @ApiResponse({ status: 400, description: 'Token inválido' })
    @ApiResponse({ status: 403, description: 'Email não corresponde ao convite' })
    @ApiResponse({ status: 404, description: 'Convite não encontrado' })
    async declineInvitation(
        @Body() body: { token: string },
        @CurrentUser() user: User
    ) {
        return this.workspaceService.declineInvitation(body.token, user);
    }

    @Get('invitations/pending')
    @ApiOperation({ summary: 'Listar convites pendentes do usuário' })
    @ApiResponse({
        status: 200,
        description: 'Lista de convites pendentes',
        schema: {
            example: {
                data: [
                    {
                        id: 'uuid',
                        email: 'user@example.com',
                        token: 'token-uuid',
                        workspace: {
                            id: 'uuid',
                            name: 'Meu Workspace',
                            description: 'Descrição'
                        },
                        inviteBy: {
                            id: 'uuid',
                            name: 'João Silva',
                            email: 'joao@example.com'
                        },
                        createdAt: '2024-01-01T00:00:00.000Z',
                        expiresAt: '2024-01-08T00:00:00.000Z'
                    }
                ]
            }
        }
    })
    async getPendingInvitations(@CurrentUser() user: User) {
        return this.workspaceService.getPendingInvitations(user);
    }
}