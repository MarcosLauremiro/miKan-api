// src/workspace/listeners/workspace-invite.listener.ts
import 'dotenv/config';
import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { WorkspaceInviteMemberEvent } from '../event/workspace-invite-member.event';
import * as nodemailer from 'nodemailer';

@Injectable()
export class WorkspaceInviteListener {
    private readonly logger = new Logger(WorkspaceInviteListener.name);
    private transporter: nodemailer.Transporter;

    constructor() {
        this.transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.GMAIL_USER,
                pass: process.env.GMAIL_PASS,
            },
        });
    }

    @OnEvent('workspace.invite', { async: true })
    async handleWorkspaceInvite(event: WorkspaceInviteMemberEvent) {
        this.logger.log(`📧 Enviando convite para workspace para: ${event.email}`);

        try {
            await this.sendInviteEmail(event);
            this.logger.log(`✅ Convite enviado com sucesso para: ${event.email}`);
        } catch (error) {
            this.logger.error(`❌ Erro ao enviar convite para ${event.email}:`, error.message);
        }
    }

    private async sendInviteEmail(event: WorkspaceInviteMemberEvent): Promise<void> {
        const inviteUrl = `${process.env.APP_URL || 'http://localhost:3000'}/workspace/accept-invite?token=${event.token}`;

        const mailOptions = {
            from: `"${process.env.APP_NAME || 'Seu App'}" <${process.env.GMAIL_USER}>`,
            to: event.email,
            subject: `Você foi convidado para o workspace ${event.workspaceName} 🎉`,
            html: this.getInviteEmailTemplate(event, inviteUrl),
        };

        await this.transporter.sendMail(mailOptions);
    }

    private getInviteEmailTemplate(event: WorkspaceInviteMemberEvent, inviteUrl: string): string {
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
                        .workspace-info {
                            background: white;
                            padding: 20px;
                            border-radius: 8px;
                            margin: 20px 0;
                            border-left: 4px solid #667eea;
                        }
                        .button {
                            display: inline-block;
                            padding: 15px 40px;
                            background: #667eea;
                            color: white !important;
                            text-decoration: none;
                            border-radius: 5px;
                            margin-top: 20px;
                            font-weight: bold;
                        }
                        .role-badge {
                            display: inline-block;
                            padding: 5px 15px;
                            background: #e0e7ff;
                            color: #667eea;
                            border-radius: 20px;
                            font-weight: bold;
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
                        <h1>🎉 Convite para Workspace</h1>
                    </div>
                    <div class="content">
                        <p>Olá!</p>
                        
                        <p>Você foi convidado para participar de um workspace:</p>
                        
                        <div class="workspace-info">
                            <h2 style="margin-top: 0;">📂 ${event.workspaceName}</h2>
                            <p>Sua função: <span class="role-badge">${this.getRoleName(event.role)}</span></p>
                        </div>
                        
                        <p>Para aceitar o convite e começar a colaborar, clique no botão abaixo:</p>
                        
                        <center>
                            <a href="${inviteUrl}" class="button">
                                Aceitar Convite
                            </a>
                        </center>
                        
                        <p style="margin-top: 30px; font-size: 14px; color: #666;">
                            <strong>Nota:</strong> Você precisará criar uma conta se ainda não tiver uma.
                        </p>
                        
                        <p style="margin-top: 30px;">
                            Atenciosamente,<br>
                            <strong>Equipe ${process.env.APP_NAME || 'do App'}</strong>
                        </p>
                    </div>
                    <div class="footer">
                        <p>Este convite é válido por 7 dias.</p>
                        <p>Se você não esperava este convite, pode ignorar este email.</p>
                    </div>
                </body>
            </html>
        `;
    }

    private getRoleName(role: string): string {
        const roles = {
            OWNER: 'Proprietário',
            ADMIN: 'Administrador',
            MEMBER: 'Membro',
        };
        return roles[role] || role;
    }
}