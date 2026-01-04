// src/auth/listeners/welcome-email.listener.ts
import 'dotenv/config'
import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { AuthRegisteredEvent } from '../event/auth-registered.event';
import * as nodemailer from 'nodemailer';

@Injectable()
export class WelcomeEmailListener {
  private readonly logger = new Logger(WelcomeEmailListener.name);
  private transporter: nodemailer.Transporter;

  constructor() {
    // Configurar o transporter do nodemailer
    this.transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: process.env.GMAIL_USER,
            pass: process.env.GMAIL_PASS,
        },
    });
  }

  @OnEvent('auth.registered', { async: true })
  async handleUserRegistered(event: AuthRegisteredEvent) {
    this.logger.log(`📧 Enviando email de boas-vindas para: ${event.email}`);

    try {
      await this.sendWelcomeEmail(event);
      this.logger.log(`✅ Email enviado com sucesso para: ${event.email}`);
    } catch (error) {
      // Não queremos que um erro no email quebre o registro
      this.logger.error(`❌ Erro ao enviar email para ${event.email}:`, error.message);
      // Aqui você pode adicionar lógica de retry ou salvar em uma fila
    }
  }

  private async sendWelcomeEmail(event: AuthRegisteredEvent): Promise<void> {
    const mailOptions = {
      from: `"${process.env.APP_NAME || 'Seu App'}" <${process.env.SMTP_FROM || process.env.SMTP_USER}>`,
      to: event.email,
      subject: `Bem-vindo(a) ao ${process.env.APP_NAME || 'nosso app'}! 🎉`,
      html: this.getWelcomeEmailTemplate(event),
    };

    await this.transporter.sendMail(mailOptions);
  }

  private getWelcomeEmailTemplate(event: AuthRegisteredEvent): string {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body {
              font-family: Arial, sans-serif;
              line-height: 1.6;
              color: #333;
              max-width: 600px;
              margin: 0 auto;
              padding: 20px;
            }
            .header {
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              color: white;
              padding: 30px;
              text-align: center;
              border-radius: 10px 10px 0 0;
            }
            .content {
              background: #f9f9f9;
              padding: 30px;
              border-radius: 0 0 10px 10px;
            }
            .button {
              display: inline-block;
              padding: 12px 30px;
              background: #667eea;
              color: white;
              text-decoration: none;
              border-radius: 5px;
              margin-top: 20px;
            }
            .footer {
              text-align: center;
              margin-top: 30px;
              color: #666;
              font-size: 12px;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>🎉 Bem-vindo(a)!</h1>
          </div>
          <div class="content">
            <p>Olá <strong>${event.name}</strong>,</p>
            
            <p>É com grande prazer que damos as boas-vindas ao <strong>${process.env.APP_NAME || 'nosso app'}</strong>!</p>
            
            <p>Você se registrou usando: <strong>${this.getProviderName(event.provider)}</strong></p>
            
            <p>Estamos muito felizes em ter você conosco. Agora você pode aproveitar todas as funcionalidades da nossa plataforma.</p>
            
            <p>Se precisar de ajuda, nossa equipe de suporte está sempre disponível.</p>
            
            <a href="${process.env.APP_URL || 'http://localhost:3000'}" class="button">
              Começar agora
            </a>
            
            <p style="margin-top: 30px;">
              Atenciosamente,<br>
              <strong>Equipe ${process.env.APP_NAME || 'do App'}</strong>
            </p>
          </div>
          <div class="footer">
            <p>Este é um email automático, por favor não responda.</p>
            <p>Se você não criou esta conta, por favor ignore este email.</p>
          </div>
        </body>
      </html>
    `;
  }

  private getProviderName(provider: string): string {
    const providers = {
      LOCAL: 'Email e Senha',
      GOOGLE: 'Google',
      GITHUB: 'GitHub',
      FACEBOOK: 'Facebook',
    };
    return providers[provider] || provider;
  }
}