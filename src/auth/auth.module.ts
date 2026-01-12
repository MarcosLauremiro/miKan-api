import { Module } from "@nestjs/common";
import { WelcomeEmailListener } from "./listeners/welcome-email.listener";
import { AuthService } from "./auth.service";
import { PrismaService } from "../../prisma/prisma.service";
import { AuthController } from "./auth.controller";
import { PassportModule } from "@nestjs/passport";
import { GoogleStrategy } from "./strategies/google.strategy";
import { GithubStrategy } from "./strategies/github.strategy";
import { ProtectRoute } from "./guards/protect-route-auth.guard";

@Module({
    imports: [
        PassportModule
    ],
    controllers: [
        AuthController
    ],
    providers: [
        AuthService,
        WelcomeEmailListener,
        PrismaService,
        GoogleStrategy,
        GithubStrategy,
        ProtectRoute
    ],
    exports:[
        AuthService,
        ProtectRoute
    ]
})

export class AuthModule {}