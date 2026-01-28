import 'dotenv/config';
import {
    BadRequestException,
    Injectable,
    UnauthorizedException,
    InternalServerErrorException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../../prisma/prisma.service';
import { LoginDTO } from './dto/auth.login.dto';
import * as bcrypt from 'bcrypt';
import { RegisterDTO } from './dto/auth.register.dto';
import { User } from '../../generated/prisma/client';
import * as jwt from 'jsonwebtoken';
import { AuthRegisteredEvent } from './event/auth-registered.event';
import { OAuth2Client } from 'google-auth-library';

export interface OAuthUser {
    providerId: string;
    email: string;
    name: string;
    picture?: string;
    provider: 'GOOGLE' | 'GITHUB';
}

interface AuthResponse {
    user: Omit<User, 'password'>;
    accessToken: string;
    refreshToken: string;
}

@Injectable()
export class AuthService {
    private googleClient: OAuth2Client;
    constructor(
        private readonly eventEmitter: EventEmitter2,
        private readonly prisma: PrismaService,
    ) { this.googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID); }

    async login(loginDto: LoginDTO): Promise<AuthResponse> {
        const user = await this.prisma.user.findUnique({
            where: { email: loginDto.email },
        });

        if (!user) {
            throw new UnauthorizedException('Email ou senha inválidos');
        }

        if (!user.password) {
            throw new UnauthorizedException(
                'Esta conta foi criada com login social. Use Google ou GitHub para entrar.',
            );
        }

        const isPasswordValid = await bcrypt.compare(
            loginDto.password,
            user.password,
        );

        if (!isPasswordValid) {
            throw new UnauthorizedException('Email ou senha inválidos');
        }

        const tokens = await this.generateTokens(user);

        return {
            user: this.sanitizeUser(user),
            ...tokens,
        };
    }

    async register(registerDto: RegisterDTO): Promise<AuthResponse> {
        if (!registerDto.password || !registerDto.email || !registerDto.name) {
            throw new BadRequestException('Todos os campos são obrigatórios');
        }

        const userExists = await this.prisma.user.findUnique({
            where: { email: registerDto.email },
        });

        if (userExists) {
            throw new BadRequestException('Usuário já existe');
        }

        const hashedPassword = await bcrypt.hash(registerDto.password, 10);

        const newUser = await this.prisma.user.create({
            data: {
                name: registerDto.name,
                email: registerDto.email,
                password: hashedPassword,
                provider: 'LOCAL',
                providerId: null,
            },
        });

        const tokens = await this.generateTokens(newUser);

        this.eventEmitter.emit(
            'auth.registered',
            new AuthRegisteredEvent(newUser.name, newUser.email, 'LOCAL'),
        );

        return {
            user: this.sanitizeUser(newUser),
            ...tokens,
        };
    }

    async verifyGoogleToken(credential: string) {
        try {
            const ticket = await this.googleClient.verifyIdToken({
                idToken: credential,
                audience: process.env.GOOGLE_CLIENT_ID,
            });

            const payload = ticket.getPayload();

            if (!payload) {
                throw new UnauthorizedException('Token inválido');
            }

            const { sub, email, name, picture } = payload;

            // Busca usuário existente
            let user = await this.prisma.user.findFirst({
                where: {
                    OR: [
                        { email },
                        { provider: 'GOOGLE', providerId: sub },
                    ],
                },
            });

            let isNewUser = false;

            if (!user) {
                // Cria novo usuário
                user = await this.prisma.user.create({
                    data: {
                        name: name || (email ? email.split('@')[0] : 'user'),
                        email: email ?? '',
                        provider: 'GOOGLE',
                        providerId: sub,
                        password: '',
                        avatarURL: picture || null,
                    },
                });

                isNewUser = true;

                this.eventEmitter.emit(
                    'auth.registered',
                    new AuthRegisteredEvent(user.name, user.email, 'GOOGLE'),
                );
            } else if (user.provider !== 'GOOGLE' || user.providerId !== sub) {
                // Atualiza provider
                user = await this.prisma.user.update({
                    where: { id: user.id },
                    data: {
                        provider: 'GOOGLE',
                        providerId: sub,
                        avatarURL: picture || user.avatarURL,
                    },
                });
            }

            const tokens = await this.generateTokens(user);

            return {
                user: this.sanitizeUser(user),
                ...tokens,
                isNewUser,
            };
        } catch (error) {
            throw new UnauthorizedException('Token do Google inválido');
        }
    }

    async validateOAuthLogin(oauthUser: OAuthUser): Promise<AuthResponse> {
        try {
            if (!oauthUser.email || !oauthUser.providerId || !oauthUser.provider) {
                throw new BadRequestException('Dados OAuth incompletos');
            }

            let user = await this.prisma.user.findFirst({
                where: {
                    OR: [
                        { email: oauthUser.email },
                        {
                            provider: oauthUser.provider,
                            providerId: oauthUser.providerId,
                        },
                    ],
                },
            });

            let isNewUser = false;

            if (!user) {
                // Cria novo usuário OAuth
                user = await this.prisma.user.create({
                    data: {
                        name: oauthUser.name,
                        email: oauthUser.email,
                        provider: oauthUser.provider,
                        providerId: oauthUser.providerId,
                        password: '', // OAuth não usa senha local
                        avatarURL: oauthUser.picture,
                    },
                });

                isNewUser = true;
            } else {
                // Atualiza informações do provedor se necessário
                const needsUpdate =
                    user.provider !== oauthUser.provider ||
                    user.providerId !== oauthUser.providerId ||
                    (oauthUser.picture && user.avatarURL !== oauthUser.picture);

                if (needsUpdate) {
                    user = await this.prisma.user.update({
                        where: { id: user.id },
                        data: {
                            provider: oauthUser.provider,
                            providerId: oauthUser.providerId,
                            avatarURL: oauthUser.picture || user.avatarURL,
                            name: oauthUser.name || user.name,
                        },
                    });
                }
            }

            const tokens = await this.generateTokens(user);

            // Emite evento apenas para novos usuários
            if (isNewUser) {
                this.eventEmitter.emit(
                    'auth.registered',
                    new AuthRegisteredEvent(user.name, user.email, oauthUser.provider),
                );
            }

            return {
                user: this.sanitizeUser(user),
                ...tokens,
            };
        } catch (error) {
            if (
                error instanceof BadRequestException ||
                error instanceof UnauthorizedException
            ) {
                throw error;
            }
            throw new InternalServerErrorException(
                'Erro ao processar autenticação OAuth',
            );
        }
    }

    async refresh(refreshToken: string): Promise<{ accessToken: string }> {
        if (!refreshToken) {
            throw new UnauthorizedException('Refresh token não fornecido');
        }

        let payload: any;

        try {
            payload = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
        } catch (error) {
            throw new UnauthorizedException('Refresh token inválido ou expirado');
        }

        const tokenInDb = await this.prisma.refreshToken.findUnique({
            where: { token: refreshToken },
        });

        if (!tokenInDb || tokenInDb.revoked) {
            throw new UnauthorizedException('Refresh token revogado ou inválido');
        }

        // Verifica se o token expirou
        if (tokenInDb.expiresAt < new Date()) {
            await this.prisma.refreshToken.update({
                where: { id: tokenInDb.id },
                data: { revoked: true },
            });
            throw new UnauthorizedException('Refresh token expirado');
        }

        const user = await this.prisma.user.findUnique({
            where: { id: payload.userId },
        });

        if (!user) {
            throw new UnauthorizedException('Usuário não encontrado');
        }

        const newAccessToken = this.generateAccessToken(user);

        return {
            accessToken: newAccessToken,
        };
    }

    async logout(refreshToken: string): Promise<void> {
        if (!refreshToken) {
            return;
        }

        await this.prisma.refreshToken.updateMany({
            where: { token: refreshToken },
            data: { revoked: true },
        });
    }

    private async generateTokens(
        user: User,
    ): Promise<{ accessToken: string; refreshToken: string }> {
        const accessToken = this.generateAccessToken(user);
        const refreshToken = this.generateRefreshToken(user);

        // Remove tokens expirados do usuário antes de criar um novo
        await this.prisma.refreshToken.deleteMany({
            where: {
                userId: user.id,
                expiresAt: { lt: new Date() },
            },
        });

        await this.prisma.refreshToken.create({
            data: {
                token: refreshToken,
                userId: user.id,
                expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
            },
        });

        return { accessToken, refreshToken };
    }

    private generateAccessToken(user: User): string {
        return jwt.sign({ userId: user.id }, process.env.JWT_ACCESS_SECRET, {
            expiresIn: '15m',
        });
    }

    private generateRefreshToken(user: User): string {
        return jwt.sign({ userId: user.id }, process.env.JWT_REFRESH_SECRET, {
            expiresIn: '7d',
        });
    }

    private sanitizeUser(user: User): Omit<User, 'password'> {
        const { password, ...userWithoutPassword } = user;
        return userWithoutPassword;
    }
}