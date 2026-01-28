import { BadRequestException, Injectable } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";

@Injectable()
export class UserService {
    constructor(
        private readonly prismaService: PrismaService
    ) { }

    async validateEmailUser(email: string) {
        if (!email) {
            throw new BadRequestException("Email Nescessario");
        }

        const user = await this.prismaService.user.findFirst({
            where: {
                email
            }
        })

        if (!user) {
            return {
                message: "Usuario nao encontrado",
                data: false
            }
        }

        return {
            message: "Usuario encontrado",
            data: user
        }
    }
}