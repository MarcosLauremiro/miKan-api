import { HttpException, HttpStatus, Injectable } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { WorkspaceCreateDTO } from "./dto/workspace.dto";
import { WorkspaceInviteMemberEvent } from "./event/workspace-invite-member.event";
import { WorkspaceMemberLeftEvent } from "./event/workspace-member-left.event";
import { WorkspaceInvitationAcceptedEvent } from "./event/workspace-invitation-accepted.event";
import { WorkspaceInvitationDeclinedEvent } from "./event/workspace-invitation-declined.event";
import { User } from "../../generated/prisma/browser";
import { LogService } from "../log/logs.service";
import { LogAction } from "../common/enums/log-action.enum";

@Injectable()
export class WorkspaceService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly eventEmitter: EventEmitter2,
        private readonly logService: LogService
    ) { }

    async createWorkspace(workspaceDTO: WorkspaceCreateDTO, user: User) {
        if (!workspaceDTO.name) {
            throw new HttpException('Campo name é obrigatório', HttpStatus.BAD_REQUEST);
        }

        const workspace = await this.prisma.$transaction(async (tx) => {
            const newWorkspace = await tx.workspace.create({
                data: {
                    ...workspaceDTO,
                    ownerId: user.id
                }
            });

            await tx.membersWorkspace.create({
                data: {
                    workspaceId: newWorkspace.id,
                    userId: user.id,
                    role: 'OWNER',
                    inviteById: user.id
                }
            });

            return newWorkspace;
        });

        await this.logService.create({
            type: "audit",
            action: LogAction.WORKSPACE_CREATED,
            module: 'workspace',
            entity: 'Workspace',
            entityId: workspace.id,
            workspaceId: workspace.id,
            actor: {
                id: user.id,
                email: user.email,
            },
            changes: {
                after: workspace,
            },
        });

        return {
            data: workspace
        };
    }

    async readWorkspaces(user: User) {
        if (!user) {
            throw new HttpException("Usuário obrigatório", HttpStatus.UNAUTHORIZED);
        }

        const workspaces = await this.prisma.workspace.findMany({
            where: {
                members: {
                    some: {
                        userId: user.id
                    }
                }
            },
            include: {
                members: {
                    where: {
                        userId: user.id
                    },
                }
            }
        });

        return {
            data: workspaces
        };
    }

    async readWorkspaceById(id: string, user: User) {
        if (!id) {
            throw new HttpException("Passe o id na rota", HttpStatus.BAD_REQUEST);
        }

        const workspace = await this.prisma.workspace.findFirst({
            where: {
                id,
                members: {
                    some: {
                        userId: user.id
                    }
                }
            },
            include: {
                members: {
                    include: {
                        user: {
                            select: {
                                id: true,
                                name: true,
                                email: true,
                                avatarURL: true
                            }
                        }
                    }
                }
            }
        });

        if (!workspace) {
            throw new HttpException("Workspace não encontrado ou você não tem acesso", HttpStatus.NOT_FOUND);
        }

        return {
            data: workspace
        };
    }

    async deleteWorkspace(id: string, user: User) {
        if (!id) {
            throw new HttpException("Passe o id na rota", HttpStatus.BAD_REQUEST);
        }

        const workspace = await this.prisma.workspace.findFirst({
            where: {
                id,
                ownerId: user.id
            }
        });

        if (!workspace) {
            throw new HttpException("Workspace não encontrado ou você não é o owner", HttpStatus.FORBIDDEN);
        }

        await this.prisma.workspace.delete({ where: { id } });

        await this.logService.create({
            type: 'audit',
            action: LogAction.WORKSPACE_DELETED,
            module: 'workspace',
            entity: 'workspace',
            entityId: id,
            workspaceId: id,

            actor: {
                id: user.id,
                email: user.email,
            },

            changes: {
                before: workspace,
                after: null,
            },

            metadata: {
                deletedByOwner: true,
            },
        });
    }

    async addMemberToWorkspace(id: string, email: string, role: string, user: User) {
        if (!email) {
            throw new HttpException("Email de usuário necessário", HttpStatus.BAD_REQUEST);
        }

        const workspace = await this.prisma.workspace.findFirst({
            where: { id },
            include: {
                members: {
                    where: { userId: user.id }
                }
            }
        });

        if (!workspace) {
            throw new HttpException("Workspace não encontrado", HttpStatus.NOT_FOUND);
        }

        const inviterMember = workspace.members[0];
        if (!inviterMember || !['ADMIN', 'OWNER'].includes(inviterMember.role)) {
            throw new HttpException("Sem permissão para convidar membros", HttpStatus.FORBIDDEN);
        }

        const userInvite = await this.prisma.user.findFirst({ where: { email } });

        if (!userInvite) {
            const existingInvitation = await this.prisma.invitations.findFirst({
                where: {
                    workspaceId: id,
                    email,
                    acceptedAt: null
                }
            });

            if (existingInvitation) {
                throw new HttpException("Já existe um convite pendente para este email", HttpStatus.CONFLICT);
            }

            const token = this.generateInviteToken();

            await this.prisma.invitations.create({
                data: {
                    email,
                    workspaceId: id,
                    token,
                    inviteById: user.id
                }
            });

            this.eventEmitter.emit(
                "workspace.invite",
                new WorkspaceInviteMemberEvent(
                    workspace.name,
                    email,
                    role,
                    user.id,
                    'INVITE',
                    token
                )
            );

            await this.logService.create({
                type: 'audit',
                action: LogAction.WORKSPACE_ADD_MEMBER,
                module: 'workspace',
                entity: 'workspace_member',
                entityId: 'INVITE_' + email,
                workspaceId: id,

                actor: {
                    id: user.id,
                    email: user.email,
                },

                changes: {
                    before: null,
                    after: {
                        email,
                        role,
                        type: 'INVITE'
                    },
                },

                metadata: {
                    invitedBy: user.id,
                    workspaceName: workspace.name,
                },
            });


            return { message: "Convite enviado por email", type: "INVITE" };
        }

        const existingMember = await this.prisma.membersWorkspace.findFirst({
            where: {
                workspaceId: id,
                userId: userInvite.id
            }
        });

        if (existingMember) {
            throw new HttpException("Usuário já é membro deste workspace", HttpStatus.CONFLICT);
        }

        await this.prisma.membersWorkspace.create({
            data: {
                workspaceId: id,
                userId: userInvite.id,
                role: role,
                inviteById: user.id
            }
        });

        await this.logService.create({
            type: 'audit',
            action: LogAction.WORKSPACE_ADD_MEMBER,
            module: 'workspace',
            entity: 'workspace_member',
            entityId: userInvite.id,
            workspaceId: id,

            actor: {
                id: user.id,
                email: user.email,
            },

            changes: {
                before: null,
                after: {
                    userId: userInvite.id,
                    email: userInvite.email,
                    role,
                },
            },

            metadata: {
                addedBy: user.id,
                workspaceName: workspace.name,
            },
        });

        this.eventEmitter.emit(
            "workspace.member.added",
            new WorkspaceInviteMemberEvent(
                workspace.name,
                email,
                role,
                user.id,
                'ADDED'
            )
        );

        return { message: "Membro adicionado ao workspace", type: "ADDED" };
    }

    async updateMemberRole(workspaceId: string, memberId: string, role: string, user: User) {
        if (!workspaceId || !memberId) {
            throw new HttpException("Workspace ID e Member ID são obrigatórios", HttpStatus.BAD_REQUEST);
        }

        if (!['OWNER', 'ADMIN', 'MEMBER'].includes(role)) {
            throw new HttpException("Role inválido. Use: OWNER, ADMIN ou MEMBER", HttpStatus.BAD_REQUEST);
        }

        const workspace = await this.prisma.workspace.findFirst({
            where: { id: workspaceId },
            include: {
                members: {
                    where: { userId: user.id }
                }
            }
        });

        if (!workspace) {
            throw new HttpException("Workspace não encontrado", HttpStatus.NOT_FOUND);
        }

        const requesterMember = workspace.members[0];
        if (!requesterMember || !['OWNER', 'ADMIN'].includes(requesterMember.role)) {
            throw new HttpException("Sem permissão para atualizar membros", HttpStatus.FORBIDDEN);
        }

        const memberToUpdate = await this.prisma.membersWorkspace.findFirst({
            where: {
                id: memberId,
                workspaceId: workspaceId
            },
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                        email: true
                    }
                }
            }
        });

        if (!memberToUpdate) {
            throw new HttpException("Membro não encontrado neste workspace", HttpStatus.NOT_FOUND);
        }

        if (memberToUpdate.role === 'OWNER' && role !== 'OWNER') {
            const ownerCount = await this.prisma.membersWorkspace.count({
                where: {
                    workspaceId: workspaceId,
                    role: 'OWNER'
                }
            });

            if (ownerCount <= 1) {
                throw new HttpException(
                    "Não é possível alterar o role do último OWNER. Adicione outro OWNER primeiro.",
                    HttpStatus.CONFLICT
                );
            }
        }

        if (role === 'OWNER' && requesterMember.role !== 'OWNER') {
            throw new HttpException(
                "Apenas OWNER pode promover membros para OWNER",
                HttpStatus.FORBIDDEN
            );
        }

        if (memberToUpdate.userId === user.id) {
            throw new HttpException(
                "Você não pode alterar seu próprio role. Peça para outro administrador fazer isso.",
                HttpStatus.FORBIDDEN
            );
        }

        const updatedMember = await this.prisma.membersWorkspace.update({
            where: { id: memberId },
            data: { role },
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        avatarURL: true
                    }
                }
            }
        });

        await this.logService.create({
            type: 'audit',
            action: LogAction.WORKSPACE_UPDATE_MEMBER_ROLE,
            module: 'workspace',
            entity: 'workspace_member',
            entityId: memberId,
            workspaceId,

            actor: {
                id: user.id,
                email: user.email,
            },

            changes: {
                before: {
                    role: memberToUpdate.role,
                },
                after: {
                    role,
                },
            },

            metadata: {
                memberUserId: memberToUpdate.user.id,
                memberEmail: memberToUpdate.user.email,
                workspaceName: workspace.name,
            },
        });


        this.eventEmitter.emit(
            "workspace.member.role.updated",
            {
                workspaceName: workspace.name,
                memberEmail: memberToUpdate.user.email,
                oldRole: memberToUpdate.role,
                newRole: role,
                updatedBy: user.id
            }
        );

        return {
            message: "Role do membro atualizado com sucesso",
            data: updatedMember
        };
    }

    async removeMemberFromWorkspace(workspaceId: string, memberId: string, user: User) {
        if (!workspaceId || !memberId) {
            throw new HttpException("Workspace ID e Member ID são obrigatórios", HttpStatus.BAD_REQUEST);
        }

        const workspace = await this.prisma.workspace.findFirst({
            where: { id: workspaceId },
            include: {
                members: {
                    where: { userId: user.id }
                }
            }
        });

        if (!workspace) {
            throw new HttpException("Workspace não encontrado", HttpStatus.NOT_FOUND);
        }

        const requesterMember = workspace.members[0];
        if (!requesterMember || !['OWNER', 'ADMIN'].includes(requesterMember.role)) {
            throw new HttpException("Sem permissão para remover membros", HttpStatus.FORBIDDEN);
        }

        const memberToRemove = await this.prisma.membersWorkspace.findFirst({
            where: {
                id: memberId,
                workspaceId: workspaceId
            },
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                        email: true
                    }
                }
            }
        });

        if (!memberToRemove) {
            throw new HttpException("Membro não encontrado neste workspace", HttpStatus.NOT_FOUND);
        }

        if (memberToRemove.role === 'OWNER') {
            const ownerCount = await this.prisma.membersWorkspace.count({
                where: {
                    workspaceId: workspaceId,
                    role: 'OWNER'
                }
            });

            if (ownerCount <= 1) {
                throw new HttpException(
                    "Não é possível remover o último OWNER. Adicione outro OWNER ou delete o workspace.",
                    HttpStatus.CONFLICT
                );
            }
        }

        if (requesterMember.role === 'ADMIN' && memberToRemove.role === 'OWNER') {
            throw new HttpException(
                "Administradores não podem remover owners",
                HttpStatus.FORBIDDEN
            );
        }

        if (memberToRemove.userId === user.id) {
            throw new HttpException(
                "Use o endpoint de 'sair do workspace' para se remover. Não é possível remover a si mesmo por este endpoint.",
                HttpStatus.FORBIDDEN
            );
        }

        await this.prisma.membersWorkspace.delete({
            where: { id: memberId }
        });

        await this.logService.create({
            type: 'audit',
            action: LogAction.WORKSPACE_REMOVE_MEMBER,
            module: 'workspace',
            entity: 'workspace_member',
            entityId: memberId,
            workspaceId,

            actor: {
                id: user.id,
                email: user.email,
            },

            changes: {
                before: {
                    userId: memberToRemove.user.id,
                    email: memberToRemove.user.email,
                    role: memberToRemove.role,
                },
                after: null,
            },

            metadata: {
                removedBy: user.id,
                workspaceName: workspace.name,
            },
        });


        this.eventEmitter.emit(
            "workspace.member.removed",
            {
                workspaceName: workspace.name,
                memberEmail: memberToRemove.user.email,
                memberName: memberToRemove.user.name,
                removedBy: user.id
            }
        );

        return {
            message: "Membro removido com sucesso do workspace"
        };
    }

    async leaveWorkspace(workspaceId: string, user: User) {
        if (!workspaceId) {
            throw new HttpException("Workspace ID é obrigatório", HttpStatus.BAD_REQUEST);
        }

        const member = await this.prisma.membersWorkspace.findFirst({
            where: {
                workspaceId: workspaceId,
                userId: user.id
            }
        });

        if (!member) {
            throw new HttpException("Você não é membro deste workspace", HttpStatus.NOT_FOUND);
        }

        if (member.role === 'OWNER') {
            const ownerCount = await this.prisma.membersWorkspace.count({
                where: {
                    workspaceId: workspaceId,
                    role: 'OWNER'
                }
            });

            if (ownerCount <= 1) {
                throw new HttpException(
                    "Você é o último OWNER. Promova outro membro para OWNER antes de sair ou delete o workspace.",
                    HttpStatus.CONFLICT
                );
            }
        }

        const workspace = await this.prisma.workspace.findFirst({
            where: { id: workspaceId },
            select: { name: true }
        });

        await this.prisma.membersWorkspace.delete({
            where: { id: member.id }
        });

        await this.logService.create({
            type: 'audit',
            action: LogAction.WORKSPACE_LEAVE,
            module: 'workspace',
            entity: 'workspace_member',
            entityId: member.id,
            workspaceId,

            actor: {
                id: user.id,
                email: user.email,
                role: member.role,
            },

            changes: {
                before: {
                    userId: user.id,
                    role: member.role,
                },
                after: null,
            },

            metadata: {
                workspaceName: workspace!.name,
                reason: 'SELF_LEAVE',
            },
        });


        this.eventEmitter.emit(
            "workspace.member.left",
            new WorkspaceMemberLeftEvent(
                workspace!.name,
                user.email,
                user.name
            )
        );

        return {
            message: "Você saiu do workspace com sucesso"
        };
    }

    async acceptInvitation(token: string, user: User) {
        if (!token) {
            throw new HttpException("Token é obrigatório", HttpStatus.BAD_REQUEST);
        }

        const invitation = await this.prisma.invitations.findFirst({
            where: {
                token: token,
                acceptedAt: null
            },
            include: {
                workspace: true
            }
        });

        if (!invitation) {
            throw new HttpException(
                "Convite inválido, expirado ou já aceito",
                HttpStatus.NOT_FOUND
            );
        }

        const expirationDate = new Date(invitation.createdAt);
        expirationDate.setDate(expirationDate.getDate() + 7);

        if (new Date() > expirationDate) {
            throw new HttpException(
                "Este convite expirou. Solicite um novo convite.",
                HttpStatus.GONE
            );
        }

        if (invitation.email !== user.email) {
            throw new HttpException(
                "Este convite foi enviado para outro email. Use a conta correta ou solicite um novo convite.",
                HttpStatus.FORBIDDEN
            );
        }

        const existingMember = await this.prisma.membersWorkspace.findFirst({
            where: {
                workspaceId: invitation.workspaceId,
                userId: user.id
            }
        });

        if (existingMember) {
            throw new HttpException(
                "Você já é membro deste workspace",
                HttpStatus.CONFLICT
            );
        }

        const result = await this.prisma.$transaction(async (tx) => {
            const newMember = await tx.membersWorkspace.create({
                data: {
                    workspaceId: invitation.workspaceId,
                    userId: user.id,
                    role: 'MEMBER',
                    inviteById: invitation.inviteById
                },
                include: {
                    workspace: true,
                    user: {
                        select: {
                            id: true,
                            name: true,
                            email: true,
                            avatarURL: true
                        }
                    }
                }
            });

            await tx.invitations.update({
                where: { id: invitation.id },
                data: {
                    acceptedAt: new Date(),
                    acceptedByUserId: user.id
                }
            });

            return newMember;
        });

        this.eventEmitter.emit(
            "workspace.invitation.accepted",
            new WorkspaceInvitationAcceptedEvent(
                invitation.workspace.name,
                user.email,
                user.name,
                invitation.inviteById
            )
        );

        return {
            message: "Convite aceito com sucesso! Bem-vindo ao workspace.",
            data: result
        };
    }

    async declineInvitation(token: string, user: User) {
        if (!token) {
            throw new HttpException("Token é obrigatório", HttpStatus.BAD_REQUEST);
        }

        const invitation = await this.prisma.invitations.findFirst({
            where: {
                token: token,
                acceptedAt: null
            },
            include: {
                workspace: true
            }
        });

        if (!invitation) {
            throw new HttpException(
                "Convite inválido ou já processado",
                HttpStatus.NOT_FOUND
            );
        }

        if (invitation.email !== user.email) {
            throw new HttpException(
                "Este convite foi enviado para outro email",
                HttpStatus.FORBIDDEN
            );
        }

        await this.prisma.invitations.delete({
            where: { id: invitation.id }
        });

        this.eventEmitter.emit(
            "workspace.invitation.declined",
            new WorkspaceInvitationDeclinedEvent(
                invitation.workspace.name,
                user.email,
                user.name,
                invitation.inviteById
            )
        );

        return {
            message: "Convite recusado"
        };
    }

    async getPendingInvitations(user: User) {
        const invitations = await this.prisma.invitations.findMany({
            where: {
                inviteById: user.id,
                acceptedAt: null
            },
            include: {
                workspace: {
                    select: {
                        id: true,
                        name: true,
                        description: true
                    }
                },
                inviteBy: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        avatarURL: true
                    }
                }
            },
            orderBy: {
                createdAt: 'desc'
            }
        });

        const validInvitations = invitations.filter(inv => {
            const expirationDate = new Date(inv.createdAt);
            expirationDate.setDate(expirationDate.getDate() + 7);
            return new Date() <= expirationDate;
        });

        return {
            data: validInvitations.map(inv => ({
                ...inv,
                expiresAt: new Date(new Date(inv.createdAt).getTime() + 7 * 24 * 60 * 60 * 1000)
            }))
        };
    }

    private generateInviteToken(): string {
        return `${Date.now()}-${Math.random().toString(36).substring(7)}`;
    }
}