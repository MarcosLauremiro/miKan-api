// src/auth/strategies/github.strategy.ts
import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, Profile } from 'passport-github2';

@Injectable()
export class GithubStrategy extends PassportStrategy(Strategy, 'github') {
  constructor() {
    super({
      clientID: process.env.GITHUB_CLIENT_ID!,
      clientSecret: process.env.GITHUB_CLIENT_SECRET!,
      callbackURL: process.env.GITHUB_CALLBACK_URL!,
      scope: ['user:email'],
    });

  }

  async validate(
    accessToken: string,
    refreshToken: string,
    profile: Profile,
    done: (error: any, user?: any) => void,
  ): Promise<any> {
    try {

      const { id, displayName, emails, photos, username } = profile;

      // GitHub pode não retornar email se o perfil for privado
      const email = emails?.[0]?.value;

      if (!email) {
        console.error('❌ Email não fornecido pelo GitHub');
        return done(new Error('Email é obrigatório. Configure seu email como público no GitHub.'), null);
      }

      const user = {
        providerId: id,
        email,
        name: displayName || username || email.split('@')[0],
        picture: photos?.[0]?.value,
        provider: 'GITHUB' as const,
      };

      done(null, user);
    } catch (error) {
      console.error('❌ Erro no GitHub Strategy:', error);
      done(error, null);
    }
  }
}