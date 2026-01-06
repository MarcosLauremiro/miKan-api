// src/workspace/listeners/workspace-member-added.listener.ts
import 'dotenv/config';
import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { WorkspaceInviteMemberEvent } from '../event/workspace-invite-member.event';
import * as nodemailer from 'nodemailer';

@Injectable()
export class WorkspaceMemberAddedListener {
    private readonly logger = new Logger(WorkspaceMemberAddedListener.name);
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

    @OnEvent('workspace.member.added', { async: true })
    async handleMemberAdded(event: WorkspaceInviteMemberEvent) {
        this.logger.log(`📧 Enviando notificação de adição ao workspace para: ${event.email}`);

        try {
            await this.sendMemberAddedEmail(event);
            this.logger.log(`✅ Notificação enviada com sucesso para: ${event.email}`);
        } catch (error) {
            this.logger.error(`❌ Erro ao enviar notificação para ${event.email}:`, error.message);
        }
    }

    private async sendMemberAddedEmail(event: WorkspaceInviteMemberEvent): Promise<void> {
        const workspaceUrl = `${process.env.APP_URL || 'http://localhost:3000'}/workspace/${event.workspaceName}`;

        const mailOptions = {
            from: `"${process.env.APP_NAME || 'Seu App'}" <${process.env.GMAIL_USER}>`,
            to: event.email,
            subject: `Você foi adicionado ao workspace ${event.workspaceName} ✨`,
            html: this.getMemberAddedEmailTemplate(event, workspaceUrl),
        };

        await this.transporter.sendMail(mailOptions);
    }

    private getMemberAddedEmailTemplate(event: WorkspaceInviteMemberEvent, workspaceUrl: string): string {
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
                            background: linear-gradient(135deg, #10b981 0%, #059669 100%);
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
                            border-left: 4px solid #10b981;
                        }
                        .button {
                            display: inline-block;
                            padding: 15px 40px;
                            background: #10b981;
                            color: white !important;
                            text-decoration: none;
                            border-radius: 5px;
                            margin-top: 20px;
                            font-weight: bold;
                        }
                        .role-badge {
                            display: inline-block;
                            padding: 5px 15px;
                            background: #d1fae5;
                            color: #059669;
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
                        <h1>✨ Você foi adicionado!</h1>
                    </div>
                    <div class="content">
                        <p>Ótimas notícias!</p>
                        
                        <p>Você foi adicionado ao workspace:</p>
                        
                        <div class="workspace-info">
                            <h2 style="margin-top: 0;">📂 ${event.workspaceName}</h2>
                            <p>Sua função: <span class="role-badge">${this.getRoleName(event.role)}</span></p>
                        </div>
                        
                        <p>Agora você pode colaborar com sua equipe e acessar todos os projetos e tarefas do workspace.</p>
                        
                        <center>
                            <a href="${workspaceUrl}" class="button">
                                Acessar Workspace
                            </a>
                        </center>
                        
                        <p style="margin-top: 30px;">
                            Atenciosamente,<br>
                            <strong>Equipe ${process.env.APP_NAME || 'do App'}</strong>
                        </p>
                    </div>
                    <div class="footer">
                        <p>Este é um email automático, por favor não responda.</p>
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