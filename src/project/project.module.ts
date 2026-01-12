import { Module } from "@nestjs/common";
import { ProjectController } from "./project.controller";
import { ProjectService } from "./project.service";
import { ProtectRoute } from "../auth/guards/protect-route-auth.guard";
import { PrismaService } from "../../prisma/prisma.service";
import { PrismaModule } from "../../prisma/project.module";

@Module({
    imports: [PrismaModule],
    controllers: [ProjectController],
    providers: [
        ProjectService,
        ProtectRoute,
        PrismaService
    ],
    exports:[]
})

export class ProjectModule {}