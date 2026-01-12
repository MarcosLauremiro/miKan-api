// src/list/list.service.ts
import { HttpException, HttpStatus, Injectable } from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { PrismaService } from "../../prisma/prisma.service";
import { ListCreateDto } from "./dto/list.create.dto";
import { User } from "../../generated/prisma/browser";
import { ListCreatedEvent } from "./event/list-created.event";
import { ListUpdateDto } from "./dto/list.update.dto";
import { ListDeletedEvent } from "./event/list-deleted.event";


@Injectable()
export class ListService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly eventEmitter: EventEmitter2
    ) { }

    async create(projectId: string, listCreateDto: ListCreateDto, user: User) {
        if (!projectId) {
            throw new HttpException("Project ID é obrigatório", HttpStatus.BAD_REQUEST);
        }

        if (!listCreateDto.name) {
            throw new HttpException("Nome da lista é obrigatório", HttpStatus.BAD_REQUEST);
        }

        // Verificar se o projeto existe e se o usuário tem acesso
        const project = await this.prisma.project.findFirst({
            where: {
                id: projectId,
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
                workspace: {
                    select: {
                        id: true,
                        name: true
                    }
                }
            }
        });

        if (!project) {
            throw new HttpException(
                "Projeto não encontrado ou você não tem acesso",
                HttpStatus.FORBIDDEN
            );
        }

        // Criar lista
        const list = await this.prisma.list.create({
            data: {
                name: listCreateDto.name,
                projectId: projectId
            },
            include: {
                project: {
                    select: {
                        id: true,
                        name: true,
                        workspace: {
                            select: {
                                id: true,
                                name: true
                            }
                        }
                    }
                },
                _count: {
                    select: {
                        tasks: true
                    }
                }
            }
        });

        // Emitir evento
        this.eventEmitter.emit(
            "list.created",
            new ListCreatedEvent(
                list.id,
                list.name,
                project.id,
                project.name,
                user.id,
                user.name,
                project!.workspace!.id,
                project!.workspace!.name
            )
        );

        return {
            message: "Lista criada com sucesso",
            data: list
        };
    }

    async findAll(projectId: string, user: User) {
        if (!projectId) {
            throw new HttpException("Project ID é obrigatório", HttpStatus.BAD_REQUEST);
        }

        // Verificar se o usuário tem acesso ao projeto
        const project = await this.prisma.project.findFirst({
            where: {
                id: projectId,
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
            }
        });

        if (!project) {
            throw new HttpException(
                "Projeto não encontrado ou você não tem acesso",
                HttpStatus.FORBIDDEN
            );
        }

        // Buscar todas as listas do projeto
        const lists = await this.prisma.list.findMany({
            where: {
                projectId: projectId
            },
            include: {
                tasks: {
                    select: {
                        id: true,
                        name: true,
                        status: true,
                        priority: true,
                        conclusion: true,
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
                },
                _count: {
                    select: {
                        tasks: true
                    }
                }
            },
            orderBy: {
                createdAt: 'asc'
            }
        });

        return {
            data: lists
        };
    }

    async findOne(id: string, user: User) {
        if (!id) {
            throw new HttpException("ID da lista é obrigatório", HttpStatus.BAD_REQUEST);
        }

        const list = await this.prisma.list.findFirst({
            where: {
                id,
                project: {
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
                }
            },
            include: {
                project: {
                    select: {
                        id: true,
                        name: true,
                        workspace: {
                            select: {
                                id: true,
                                name: true
                            }
                        }
                    }
                },
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
                        },
                        comments: {
                            select: {
                                id: true,
                                comment: true,
                                createdAt: true,
                                author: {
                                    select: {
                                        id: true,
                                        name: true,
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
                        createdAt: 'desc'
                    }
                },
                _count: {
                    select: {
                        tasks: true
                    }
                }
            }
        });

        if (!list) {
            throw new HttpException(
                "Lista não encontrada ou você não tem acesso",
                HttpStatus.NOT_FOUND
            );
        }

        return {
            data: list
        };
    }

    async update(id: string, listUpdateDto: ListUpdateDto, user: User) {
        if (!id) {
            throw new HttpException("ID da lista é obrigatório", HttpStatus.BAD_REQUEST);
        }

        // Verificar se a lista existe e se o usuário tem acesso
        const list = await this.prisma.list.findFirst({
            where: {
                id,
                project: {
                    OR: [
                        { ownerId: user.id },
                        {
                            workspace: {
                                members: {
                                    some: {
                                        userId: user.id,
                                        role: {
                                            in: ['OWNER', 'ADMIN']
                                        }
                                    }
                                }
                            },
                            private: false
                        }
                    ]
                }
            }
        });

        if (!list) {
            throw new HttpException(
                "Lista não encontrada ou você não tem permissão para editá-la",
                HttpStatus.FORBIDDEN
            );
        }

        // Atualizar lista
        const updatedList = await this.prisma.list.update({
            where: { id },
            data: {
                ...listUpdateDto,
                updatedAt: new Date()
            },
            include: {
                project: {
                    select: {
                        id: true,
                        name: true
                    }
                },
                _count: {
                    select: {
                        tasks: true
                    }
                }
            }
        });

        return {
            message: "Lista atualizada com sucesso",
            data: updatedList
        };
    }

    async delete(id: string, user: User) {
        if (!id) {
            throw new HttpException("ID da lista é obrigatório", HttpStatus.BAD_REQUEST);
        }

        // Verificar se a lista existe e se o usuário tem permissão
        const list = await this.prisma.list.findFirst({
            where: {
                id,
                project: {
                    OR: [
                        { ownerId: user.id },
                        {
                            workspace: {
                                members: {
                                    some: {
                                        userId: user.id,
                                        role: {
                                            in: ['OWNER', 'ADMIN']
                                        }
                                    }
                                }
                            },
                            private: false
                        }
                    ]
                }
            },
            include: {
                project: {
                    select: {
                        id: true,
                        name: true,
                        workspace: {
                            select: {
                                id: true,
                                name: true
                            }
                        }
                    }
                },
                _count: {
                    select: {
                        tasks: true
                    }
                }
            }
        });

        if (!list) {
            throw new HttpException(
                "Lista não encontrada ou você não tem permissão para deletá-la",
                HttpStatus.FORBIDDEN
            );
        }

        // Verificar se a lista tem tarefas
        if (list._count.tasks > 0) {
            throw new HttpException(
                `Não é possível deletar a lista. Ela contém ${list._count.tasks} tarefa(s). Mova ou delete as tarefas primeiro.`,
                HttpStatus.CONFLICT
            );
        }

        // Deletar lista
        await this.prisma.list.delete({
            where: { id }
        });

        // Emitir evento
        this.eventEmitter.emit(
            "list.deleted",
            new ListDeletedEvent(
                list.name,
                list.project.id,
                list.project.name,
                user.id,
                user.name,
                list.project.workspace!.id,
                list.project.workspace!.name
            )
        );

        return {
            message: "Lista deletada com sucesso"
        };
    }

    // Método para deletar lista com todas as tarefas (força)
    async forceDelete(id: string, user: User) {
        if (!id) {
            throw new HttpException("ID da lista é obrigatório", HttpStatus.BAD_REQUEST);
        }

        // Verificar se a lista existe e se o usuário tem permissão
        const list = await this.prisma.list.findFirst({
            where: {
                id,
                project: {
                    ownerId: user.id // Apenas o owner do projeto pode forçar delete
                }
            },
            include: {
                project: {
                    select: {
                        id: true,
                        name: true,
                        workspace: {
                            select: {
                                id: true,
                                name: true
                            }
                        }
                    }
                },
                _count: {
                    select: {
                        tasks: true
                    }
                }
            }
        });

        if (!list) {
            throw new HttpException(
                "Lista não encontrada ou você não tem permissão (apenas o owner do projeto pode forçar delete)",
                HttpStatus.FORBIDDEN
            );
        }

        // Deletar lista (e tarefas em cascata)
        await this.prisma.list.delete({
            where: { id }
        });

        // Emitir evento
        this.eventEmitter.emit(
            "list.deleted",
            new ListDeletedEvent(
                list.name,
                list.project.id,
                list.project.name,
                user.id,
                user.name,
                list.project.workspace!.id,
                list.project.workspace!.name
            )
        );

        return {
            message: `Lista deletada com sucesso junto com ${list._count.tasks} tarefa(s)`
        };
    }

    // Método para duplicar lista
    async duplicate(id: string, user: User) {
        if (!id) {
            throw new HttpException("ID da lista é obrigatório", HttpStatus.BAD_REQUEST);
        }

        // Verificar se a lista existe e se o usuário tem acesso
        const list = await this.prisma.list.findFirst({
            where: {
                id,
                project: {
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
                }
            },
            include: {
                tasks: true,
                project: {
                    select: {
                        id: true,
                        name: true
                    }
                }
            }
        });

        if (!list) {
            throw new HttpException(
                "Lista não encontrada ou você não tem acesso",
                HttpStatus.FORBIDDEN
            );
        }

        // Criar lista duplicada
        const duplicatedList = await this.prisma.list.create({
            data: {
                name: `${list.name} (Cópia)`,
                projectId: list.projectId
            },
            include: {
                project: {
                    select: {
                        id: true,
                        name: true
                    }
                },
                _count: {
                    select: {
                        tasks: true
                    }
                }
            }
        });

        return {
            message: "Lista duplicada com sucesso",
            data: duplicatedList
        };
    }
}