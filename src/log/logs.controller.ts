// log.controller.ts
import {
    Controller,
    Get,
    UseGuards
} from '@nestjs/common';
import {
    ApiTags,
    ApiOperation,
    ApiResponse,
    ApiBearerAuth
} from '@nestjs/swagger';
import { ProtectRoute } from '../auth/guards/protect-route-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '../../generated/prisma/browser';
import { LogService } from './logs.service';

@ApiTags('Logs')
@Controller('logs')
@ApiBearerAuth('access-token')
@UseGuards(ProtectRoute)
export class LogController {
    constructor(private readonly logService: LogService) { }

    @Get()
    @ApiOperation({ summary: 'Listar logs do usuário autenticado' })
    @ApiResponse({ status: 200, description: 'Lista de logs do usuário' })
    async findUserLogs(
        @CurrentUser() user: User
    ) {
        return this.logService.findByUser(user.id);
    }
}
