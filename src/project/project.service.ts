// src/project/project.service.ts
import { HttpException, HttpStatus, Injectable } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { ProjectCreateDto } from "./dto/project.create.dto";
import { ProjectCreatedEvent } from "./event/project-created.event";
import { ProjectUpdateDto } from "./dto/project.update.dto";
import { User } from "../../generated/prisma/browser";

@Injectable()
export class ProjectService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly eventEmitter: EventEmitter2
    ) { }

    async create(projectCreateDto: ProjectCreateDto, user: User, workspaceId: string) {
        if (!projectCreateDto.name) {
            throw new HttpException("Nome do projeto é obrigatório", HttpStatus.BAD_REQUEST);
        }

        if (projectCreateDto.private === undefined || projectCreateDto.private === null) {
            throw new HttpException("Campo private é obrigatório", HttpStatus.BAD_REQUEST);
        }

        if (workspaceId) {
            const workspace = await this.prisma.workspace.findFirst({
                where: {
                    id: workspaceId,
                    members: {
                        some: {
                            userId: user.id
                        }
                    }
                }
            });

            if (!workspace) {
                throw new HttpException(
                    "Workspace não encontrado ou você não tem acesso",
                    HttpStatus.FORBIDDEN
                );
            }
        }

        // Status padrão caso não sejam fornecidos
        const defaultStatus = [
            { name: 'A Fazer', color: '#ef4444' },
            { name: 'Em Progresso', color: '#3b82f6' },
            { name: 'Em Revisão', color: '#f59e0b' },
            { name: 'Concluído', color: '#10b981' }
        ];

        const statusToCreate = projectCreateDto.customStatus && projectCreateDto.customStatus.length > 0
            ? projectCreateDto.customStatus
            : defaultStatus;

        // Usar transação para criar projeto, lista inicial e status
        const project = await this.prisma.$transaction(async (tx) => {
            // 1. Criar o projeto
            const newProject = await tx.project.create({
                data: {
                    name: projectCreateDto.name,    
                    ownerId: user.id,
                    workspaceId: workspaceId || null,
                    private: projectCreateDto.private
                },
                include: {
                    owner: {
                        select: {
                            id: true,
                            name: true,
                            email: true,
                            avatarURL: true
                        }
                    },
                    workspace: {
                        select: {
                            id: true,
                            name: true
                        }
                    }
                }
            });

            // 2. Criar lista inicial
            await tx.list.create({
                data: {
                    name: projectCreateDto.initialListName || 'To Do',
                    projectId: newProject.id
                }
            });

            // 3. Criar status do projeto

            console.log("status",newProject)
            await tx.statusProject.createMany({
                data: statusToCreate.map(status => ({
                    name: status.name,
                    color: status.color,
                    projectId: newProject.id
                }))
            });

            // Retornar projeto completo com lista e status
            return tx.project.findFirst({
                where: { id: newProject.id },
                include: {
                    owner: {
                        select: {
                            id: true,
                            name: true,
                            email: true,
                            avatarURL: true
                        }
                    },
                    workspace: {
                        select: {
                            id: true,
                            name: true
                        }
                    },
                    lists: true,
                    status: true
                }
            });
        });

        // Emitir evento de projeto criado
        this.eventEmitter.emit(
            "project.created",
            new ProjectCreatedEvent(
                project!.id,
                project!.name,
                user.id,
                user.name,
                workspaceId || null,
                project!.workspace?.name || null,
                project!.private!
            )
        );
    

        return {
            message: "Projeto criado com sucesso",
            data: project
        };
    }

    async findAll(user: User, workspaceId?: string) {
        const whereClause: any = {
            OR: [
                { ownerId: user.id },
                {
                    workspace: {
                        members: {
                            some: {
                                userId: user.id
                            }
                        }
                    },
                    private: false
                }
            ]
        };

        if (workspaceId) {
            whereClause.workspaceId = workspaceId;
        }

        const projects = await this.prisma.project.findMany({
            where: whereClause,
            include: {
                owner: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        avatarURL: true
                    }
                },
                workspace: {
                    select: {
                        id: true,
                        name: true
                    }
                },
                lists: {
                    select: {
                        id: true,
                        name: true,
                        _count: {
                            select: {
                                tasks: true
                            }
                        }
                    }
                },
                status: true
            },
            orderBy: {
                createdAt: 'desc'
            }
        });

        return {
            data: projects
        };
    }

    async findOne(id: string, user: User) {
        if (!id) {
            throw new HttpException("ID do projeto é obrigatório", HttpStatus.BAD_REQUEST);
        }

        const project = await this.prisma.project.findFirst({
            where: {
                id,
                OR: [
                    { ownerId: user.id },
                    {
                        workspace: {
                            members: {
                                some: {
                                    userId: user.id
                                }
                            }
                        },
                        private: false
                    }
                ]
            },
            include: {
                owner: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        avatarURL: true
                    }
                },
                workspace: {
                    select: {
                        id: true,
                        name: true
                    }
                },
                lists: {
                    include: {
                        tasks: {
                            include: {
                                owner: {
                                    select: {
                                        id: true,
                                        name: true,
                                        email: true,
                                        avatarURL: true
                                    }
                                },
                                responsible: {
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
                        }
                    },
                    orderBy: {
                        createdAt: 'asc'
                    }
                },
                status: true
            }
        });

        if (!project) {
            throw new HttpException(
                "Projeto não encontrado ou você não tem acesso",
                HttpStatus.NOT_FOUND
            );
        }

        return {
            data: project
        };
    }

    async update(id: string, projectUpdateDto: ProjectUpdateDto, user: User) {
        if (!id) {
            throw new HttpException("ID do projeto é obrigatório", HttpStatus.BAD_REQUEST);
        }

        // Verificar se o projeto existe e se o usuário é o owner
        const project = await this.prisma.project.findFirst({
            where: {
                id,
                ownerId: user.id
            }
        });

        if (!project) {
            throw new HttpException(
                "Projeto não encontrado ou você não tem permissão para editá-lo",
                HttpStatus.FORBIDDEN
            );
        }

        const updatedProject = await this.prisma.project.update({
            where: { id },
            data: {
                ...projectUpdateDto,
                updatedAt: new Date()
            },
            include: {
                owner: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        avatarURL: true
                    }
                },
                workspace: {
                    select: {
                        id: true,
                        name: true
                    }
                },
                lists: true,
                status: true
            }
        });

        return {
            message: "Projeto atualizado com sucesso",
            data: updatedProject
        };
    }

    async delete(id: string, user: User) {
        if (!id) {
            throw new HttpException("ID do projeto é obrigatório", HttpStatus.BAD_REQUEST);
        }

        // Verificar se o projeto existe e se o usuário é o owner
        const project = await this.prisma.project.findFirst({
            where: {
                id,
                ownerId: user.id
            }
        });

        if (!project) {
            throw new HttpException(
                "Projeto não encontrado ou você não tem permissão para deletá-lo",
                HttpStatus.FORBIDDEN
            );
        }

        await this.prisma.project.delete({
            where: { id }
        });

        return {
            message: "Projeto deletado com sucesso"
        };
    }

    // Gerenciar status do projeto
    async addStatus(projectId: string, name: string, color: string, user: User) {
        const project = await this.prisma.project.findFirst({
            where: {
                id: projectId,
                ownerId: user.id
            }
        });

        if (!project) {
            throw new HttpException(
                "Projeto não encontrado ou você não tem permissão",
                HttpStatus.FORBIDDEN
            );
        }

        const status = await this.prisma.statusProject.create({
            data: {
                name,
                color,
                projectId
            }
        });

        return {
            message: "Status adicionado com sucesso",
            data: status
        };
    }

    async updateStatus(statusId: string, name: string, color: string, user: User) {
        const status = await this.prisma.statusProject.findFirst({
            where: { id: statusId },
            include: { project: true }
        });

        if (!status || status.project.ownerId !== user.id) {
            throw new HttpException(
                "Status não encontrado ou você não tem permissão",
                HttpStatus.FORBIDDEN
            );
        }

        const updatedStatus = await this.prisma.statusProject.update({
            where: { id: statusId },
            data: { name, color }
        });

        return {
            message: "Status atualizado com sucesso",
            data: updatedStatus
        };
    }

    async deleteStatus(statusId: string, user: User) {
        const status = await this.prisma.statusProject.findFirst({
            where: { id: statusId },
            include: { project: true }
        });

        if (!status || status.project.ownerId !== user.id) {
            throw new HttpException(
                "Status não encontrado ou você não tem permissão",
                HttpStatus.FORBIDDEN
            );
        }

        await this.prisma.statusProject.delete({
            where: { id: statusId }
        });

        return {
            message: "Status deletado com sucesso"
        };
    }
}