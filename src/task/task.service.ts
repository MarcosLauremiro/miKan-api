import { HttpException, HttpStatus, Injectable } from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { PrismaService } from "../../prisma/prisma.service";
import { CreateTaskDto } from "./dto/task.create.dto";
import { User } from "../../generated/prisma/browser";

@Injectable()
export class TaskService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly eventEmitter: EventEmitter2
    ) { }

    async create(createTaskDto: CreateTaskDto, user: User) {
        // Validar campos obrigatórios
        if (!createTaskDto.name || !createTaskDto.statusId || !createTaskDto.priority) {
            throw new HttpException(
                "Nome, status e prioridade são obrigatórios",
                HttpStatus.BAD_REQUEST
            );
        }
        // Validar status existe
        const status = await this.prisma.statusProject.findFirst({
            where: { id: createTaskDto.statusId },
            include: {
                project: {
                    include: {
                        workspace: true
                    }
                }
            }
        });

        if (!status) {
            throw new HttpException("Status não encontrado", HttpStatus.NOT_FOUND);
        }

        return {
            message: "Tarefa criada com sucesso",
            data: ""
        };
    }
}