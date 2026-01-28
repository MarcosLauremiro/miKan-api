import { Controller, Get, Post, Body, UseGuards, Req, Res, HttpStatus, HttpCode } from '@nestjs/common';
import { AuthService, OAuthUser } from './auth.service';
import { LoginDTO } from './dto/auth.login.dto';
import { RegisterDTO } from './dto/auth.register.dto';
import { GoogleAuthGuard } from './guards/google-auth.guard';
import { GithubAuthGuard } from './guards/github-auth.guard';
import { Response, Request } from 'express';
import { ProtectRoute } from './guards/protect-route-auth.guard';
import { CurrentUser } from './decorators/current-user.decorator';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

@Controller('auth')
export class AuthController {

  private readonly frontendUrl: string;
  private readonly cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 dias
  };

  constructor(private readonly authService: AuthService) {
    this.frontendUrl = process.env.FRONTEND_URL || 'http://localhost:8080';
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() loginDto: LoginDTO, @Res({ passthrough: true }) res: Response) {
    const result = await this.authService.login(loginDto);

    res.cookie('refreshToken', result.refreshToken, this.cookieOptions);

    return {
      user: result.user,
      accessToken: result.accessToken,
    };
  }

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  async register(@Body() registerDto: RegisterDTO, @Res({ passthrough: true }) res: Response) {
    const result = await this.authService.register(registerDto);

    res.cookie('refreshToken', result.refreshToken, this.cookieOptions);

    return {
      user: result.user,
      accessToken: result.accessToken,
    };
  }

  @Post('google/verify')
  @HttpCode(HttpStatus.OK)
  async verifyGoogleToken(
    @Body('credential') credential: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.verifyGoogleToken(credential);

    res.cookie('refreshToken', result.refreshToken, this.cookieOptions);

    return {
      user: result.user,
      token: result.accessToken,
      isNewUser: result.isNewUser,
    };
  }

  @Get('github')
  @UseGuards(GithubAuthGuard)
  async githubAuth() {
  }

  @Get('github/callback')
  @UseGuards(GithubAuthGuard)
  async githubAuthCallback(@Req() req: Request, @Res() res: Response) {

    try {
      const result = await this.authService.validateOAuthLogin(req.user as OAuthUser);

      res.cookie('refreshToken', result.refreshToken, this.cookieOptions);

      const redirectUrl = new URL(`${this.frontendUrl}/github/callback`);
      redirectUrl.searchParams.append('accessToken', result.accessToken);
      redirectUrl.searchParams.append('provider', 'github');

      res.redirect(redirectUrl.toString());
    } catch (error) {
      console.error('❌ Erro no callback do GitHub:', error);

      const errorUrl = new URL(`${this.frontendUrl}/auth/error`);
      errorUrl.searchParams.append(
        'message',
        error.message || 'Erro ao autenticar com GitHub',
      );

      res.redirect(errorUrl.toString());
    }
  }


  @Post('refresh')
  async refresh(@Req() req: Request) {
    const refreshToken = req.cookies['refreshToken'];
    return this.authService.refresh(refreshToken);
  }

  @Post('logout')
  async logout(@Body('refreshToken') refreshToken: string) {
    return this.authService.logout(refreshToken);
  }

  @ApiTags('Users')
  @ApiBearerAuth('access-token')
  @Get("me")
  @UseGuards(ProtectRoute)
  me(@CurrentUser() user) {
    return user
  }
}