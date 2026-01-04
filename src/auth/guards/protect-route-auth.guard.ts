import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from "@nestjs/common";
import jwt from 'jsonwebtoken';
import { PrismaService } from "../../prisma.service";

@Injectable()
export class ProtectRoute implements CanActivate {
    constructor(private readonly prisma: PrismaService) {}

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const request = context.switchToHttp().getRequest();
        
        // 1. Extrai o token do header Authorization
        const token = this.extractTokenFromHeader(request);
        
        if (!token) {
            throw new UnauthorizedException('Token não fornecido');
        }

        try {
            // 2. Verifica e decodifica o token JWT
            const payload = jwt.verify(
                token,
                process.env.JWT_ACCESS_SECRET
            ) as { userId: string };

            // 3. Busca o usuário no banco de dados
            const user = await this.prisma.user.findUnique({
                where: { id: payload.userId },
                select: {
                    id: true,
                    name: true,
                    email: true,
                    provider: true,
                    createdAt: true,
                    updatedAt: true,
                    // Não retorna a senha por segurança
                }
            });

            if (!user) {
                throw new UnauthorizedException('Usuário não encontrado');
            }

            // 4. Anexa o usuário na requisição para uso nos controllers
            request.user = user;
            
            return true;

        } catch (error) {
            if (error.name === 'TokenExpiredError') {
                throw new UnauthorizedException('Token expirado');
            }
            if (error.name === 'JsonWebTokenError') {
                throw new UnauthorizedException('Token inválido');
            }
            throw new UnauthorizedException('Falha na autenticação');
        }
    }

    private extractTokenFromHeader(request: any): string | null {
        const authHeader = request.headers.authorization;
        
        if (!authHeader) {
            return null;
        }

        // Formato esperado: "Bearer <token>"
        const [type, token] = authHeader.split(' ');
        
        return type === 'Bearer' ? token : null;
    }
}