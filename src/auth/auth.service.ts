import 'dotenv/config'
import { BadRequestException, Injectable, UnauthorizedException } from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { PrismaService } from "../../prisma/prisma.service";
import { LoginDTO } from "./dto/auth.login.dto";
import * as bcrypt from 'bcrypt';
import { RegisterDTO } from "./dto/auth.register.dto";
import { User } from "../../generated/prisma/client";
import jwt from 'jsonwebtoken';
import { AuthRegisteredEvent } from "./event/auth-registered.event";

interface OAuthUser {
    providerId: string;
    email: string;
    name: string;
    picture?: string;
    provider: 'GOOGLE' | 'GITHUB';
}

@Injectable()
export class AuthService {
    constructor(
        private readonly eventEmitter: EventEmitter2,
        private readonly prisma: PrismaService,
    ) { }

    async login(loginDto: LoginDTO) {
        const user = await this.prisma.user.findUnique({
            where: {
                email: loginDto.email,
            },
        });

        if (!user) {
            throw new UnauthorizedException("Email ou senha inválidos");
        }

        const isPasswordValid = await bcrypt.compare(loginDto.password, user.password);

        if (!isPasswordValid) {
            throw new UnauthorizedException("Email ou senha inválidos");
        }

        const accessToken = this.generateAccessToken(user);
        const refreshToken = this.generateRefreshToken(user);

        await this.prisma.refreshToken.create({
            data: {
                token: refreshToken,
                userId: user.id,
                expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
            },
        });

        return {
            user,
            accessToken,
            refreshToken,
        };
    }

    async register(registerDto: RegisterDTO) {

        if (!registerDto.password || !registerDto.email || !registerDto.name) {
            throw new BadRequestException("Todos os campos são obrigatórios");
        }

        const userExists = await this.prisma.user.findUnique({
            where: {
                email: registerDto.email,
            },
        });

        if (userExists) {
            throw new BadRequestException("Usuário já existe");
        }

        const newUser = await this.prisma.user.create({
            data: {
                name: registerDto.name,
                email: registerDto.email,
                password: await bcrypt.hash(registerDto.password, 10),
                provider: 'LOCAL',
                providerId: null,
            },
        });

        const token = this.generateAccessToken(newUser);

        this.eventEmitter.emit(
            'auth.registered', 
            new AuthRegisteredEvent(newUser.name, newUser.email, 'LOCAL')
        );

        return {
            user: newUser,
            token,
        };
    }

    // Novo método para OAuth (Google e GitHub)
    async validateOAuthLogin(oauthUser: OAuthUser) {
        // Busca usuário existente pelo email ou providerId
        let user = await this.prisma.user.findFirst({
            where: {
                OR: [
                    { email: oauthUser.email },
                    { 
                        provider: oauthUser.provider,
                        providerId: oauthUser.providerId 
                    }
                ]
            },
        });

        // Se o usuário não existe, cria um novo
        if (!user) {
            user = await this.prisma.user.create({
                data: {
                    name: oauthUser.name,
                    email: oauthUser.email,
                    provider: oauthUser.provider,
                    providerId: oauthUser.providerId,
                    password: '', // OAuth não usa senha
                },
            });

            // Emite evento de registro
            this.eventEmitter.emit(
                'auth.registered',
                new AuthRegisteredEvent(user.name, user.email, oauthUser.provider)
            );
        } else if (user.provider !== oauthUser.provider || user.providerId !== oauthUser.providerId) {
            // Atualiza o provider caso o usuário tenha se registrado de outra forma
            user = await this.prisma.user.update({
                where: { id: user.id },
                data: {
                    provider: oauthUser.provider,
                    providerId: oauthUser.providerId,
                },
            });
        }

        // Gera tokens
        const accessToken = this.generateAccessToken(user);
        const refreshToken = this.generateRefreshToken(user);

        // Salva refresh token no banco
        await this.prisma.refreshToken.create({
            data: {
                token: refreshToken,
                userId: user.id,
                expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
            },
        });

        return {
            user,
            accessToken,
            refreshToken,
        };
    }

    async refresh(refreshToken: string) {
        if (!refreshToken) {
            throw new UnauthorizedException();
        }

        let payload: any;

        try {
            payload = jwt.verify(
                refreshToken,
                process.env.JWT_REFRESH_SECRET
            );
        } catch {
            throw new UnauthorizedException();
        }

        const tokenInDb = await this.prisma.refreshToken.findUnique({
            where: { token: refreshToken },
        });

        if (!tokenInDb || tokenInDb.revoked) {
            throw new UnauthorizedException();
        }

        const user = await this.prisma.user.findUnique({
            where: { id: payload.userId },
        });

        const newAccessToken = this.generateAccessToken(user as User);

        return {
            accessToken: newAccessToken,
        };
    }

    async logout(refreshToken: string) {
        await this.prisma.refreshToken.updateMany({
            where: { token: refreshToken },
            data: { revoked: true },
        });
    }

    private generateAccessToken(user: User) {
        return jwt.sign(
            { userId: user.id },
            process.env.JWT_ACCESS_SECRET,
            { expiresIn: '15m' }
        );
    }

    private generateRefreshToken(user: User) {
        return jwt.sign(
            { userId: user.id },
            process.env.JWT_REFRESH_SECRET,
            { expiresIn: '7d' }
        );
    }
}