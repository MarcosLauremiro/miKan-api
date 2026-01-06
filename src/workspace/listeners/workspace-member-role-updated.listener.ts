// src/workspace/listeners/workspace-member-role-updated.listener.ts
import 'dotenv/config';
import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import * as nodemailer from 'nodemailer';
import { WorkspaceMemberRoleUpdatedEvent } from '../event/workspace-member-role-updated.event';

@Injectable()
export class WorkspaceMemberRoleUpdatedListener {
    private readonly logger = new Logger(WorkspaceMemberRoleUpdatedListener.name);
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

    @OnEvent('workspace.member.role.updated', { async: true })
    async handleRoleUpdated(event: WorkspaceMemberRoleUpdatedEvent) {
        this.logger.log(`📧 Enviando notificação de alteração de role para: ${event.memberEmail}`);

        try {
            await this.sendRoleUpdatedEmail(event);
            this.logger.log(`✅ Notificação enviada com sucesso para: ${event.memberEmail}`);
        } catch (error) {
            this.logger.error(`❌ Erro ao enviar notificação para ${event.memberEmail}:`, error.message);
        }
    }

    private async sendRoleUpdatedEmail(event: WorkspaceMemberRoleUpdatedEvent): Promise<void> {
        const workspaceUrl = `${process.env.APP_URL || 'http://localhost:3000'}/workspace/${event.workspaceName}`;

        const mailOptions = {
            from: `"${process.env.APP_NAME || 'Seu App'}" <${process.env.GMAIL_USER}>`,
            to: event.memberEmail,
            subject: `Sua função foi atualizada no workspace ${event.workspaceName} 🔄`,
            html: this.getRoleUpdatedEmailTemplate(event, workspaceUrl),
        };

        await this.transporter.sendMail(mailOptions);
    }

    private getRoleUpdatedEmailTemplate(event: WorkspaceMemberRoleUpdatedEvent, workspaceUrl: string): string {
        const isPromotion = this.isPromotion(event.oldRole, event.newRole);
        const emoji = isPromotion ? '🎉' : '🔄';

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
                            background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
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
                        .role-change {
                            background: white;
                            padding: 20px;
                            border-radius: 8px;
                            margin: 20px 0;
                            border-left: 4px solid #f59e0b;
                        }
                        .role-badge {
                            display: inline-block;
                            padding: 5px 15px;
                            border-radius: 20px;
                            font-weight: bold;
                            margin: 0 5px;
                        }
                        .old-role {
                            background: #fee2e2;
                            color: #991b1b;
                        }
                        .new-role {
                            background: #d1fae5;
                            color: #059669;
                        }
                        .button {
                            display: inline-block;
                            padding: 15px 40px;
                            background: #f59e0b;
                            color: white !important;
                            text-decoration: none;
                            border-radius: 5px;
                            margin-top: 20px;
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
                        <h1>${emoji} Função Atualizada</h1>
                    </div>
                    <div class="content">
                        <p>Olá <strong>${event.memberName}</strong>,</p>
                        
                        <p>Sua função no workspace foi atualizada:</p>
                        
                        <div class="role-change">
                            <h2 style="margin-top: 0;">📂 ${event.workspaceName}</h2>
                            <p style="text-align: center; font-size: 18px;">
                                <span class="role-badge old-role">${this.getRoleName(event.oldRole)}</span>
                                →
                                <span class="role-badge new-role">${this.getRoleName(event.newRole)}</span>
                            </p>
                        </div>
                        
                        ${this.getPermissionsMessage(event.newRole, isPromotion)}
                        
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

    private isPromotion(oldRole: string, newRole: string): boolean {
        const hierarchy = { MEMBER: 1, ADMIN: 2, OWNER: 3 };
        return hierarchy[newRole] > hierarchy[oldRole];
    }

    private getPermissionsMessage(role: string, isPromotion: boolean): string {
        const messages = {
            OWNER: '<p>🎉 Parabéns! Como proprietário, você agora tem controle total sobre o workspace, incluindo gerenciamento de membros e configurações.</p>',
            ADMIN: '<p>✨ Como administrador, você pode gerenciar membros, projetos e configurações do workspace.</p>',
            MEMBER: '<p>Como membro, você pode colaborar em projetos e tarefas do workspace.</p>',
        };

        return messages[role] || '';
    }
}