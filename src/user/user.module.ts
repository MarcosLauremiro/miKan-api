import { Module } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { UserService } from "./user.service";
import { UserController } from "./user.controller";

@Module ({
    exports: [],
    controllers: [UserController],
    providers:[PrismaService, UserService],
})

export class UserModule {}