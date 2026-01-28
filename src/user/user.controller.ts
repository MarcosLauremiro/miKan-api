import { Controller, Get, Param } from "@nestjs/common";
import { UserService } from "./user.service";
import { ApiBearerAuth, ApiOperation, ApiParam, ApiResponse, ApiTags } from "@nestjs/swagger";

@ApiTags('Users')
@Controller('users')
@ApiBearerAuth('access-token')
@Controller("user")
export class UserController {
    constructor (
        private readonly userService: UserService
    ) {}

    @Get(":email")
    @ApiOperation({ summary: 'Buscar usuario por email' })
    @ApiParam({ name: 'email', description: 'email do usuario', type: String })
    @ApiResponse({ status: 200, description: 'usuario encontrado' })
    @ApiResponse({ status: 404, description: 'usuario não encontrado' })
    async validateEmailUser (@Param('email') email: string,) {
        return this.userService.validateEmailUser(email)
    }
}