// src/workspace/listeners/workspace-invitation-accepted.listener.ts
import 'dotenv/config';
import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { WorkspaceInvitationAcceptedEvent } from '../event/workspace-invitation-accepted.event';
import { PrismaService } from '../../prisma.service';
import * as nodemailer from 'nodemailer';

@Injectable()
export class WorkspaceInvitationAcceptedListener {
    private readonly logger = new Logger(WorkspaceInvitationAcceptedListener.name);
    private transporter: nodemailer.Transporter;

    constructor(private readonly prisma: PrismaService) {
        this.transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.GMAIL_USER,
                pass: process.env.GMAIL_PASS,
            },
        });
    }

    @OnEvent('workspace.invitation.accepted', { async: true })
    async handleInvitationAccepted(event: WorkspaceInvitationAcceptedEvent) {
        this.logger.log(`📧 Notificando aceitação de convite para workspace ${event.workspaceName}`);

        try {
            // Buscar email de quem convidou
            const inviter = await this.prisma.user.findFirst({
                where: { id: event.invitedBy },
                select: { email: true, name: true }
            });

            if (inviter) {
                await this.sendInvitationAcceptedEmail(event, inviter.email);
                this.logger.log(`✅ Notificação enviada para: ${inviter.email}`);
            }
        } catch (error) {
            this.logger.error(`❌ Erro ao enviar notificação:`, error.message);
        }
    }

    private async sendInvitationAcceptedEmail(
        event: WorkspaceInvitationAcceptedEvent, 
        inviterEmail: string
    ): Promise<void> {
        const workspaceUrl = `${process.env.APP_URL || 'http://localhost:3000'}/workspace/${event.workspaceName}`;

        const mailOptions = {
            from: `"${process.env.APP_NAME || 'Seu App'}" <${process.env.GMAIL_USER}>`,
            to: inviterEmail,
            subject: `${event.memberName} aceitou seu convite! 🎉`,
            html: this.getInvitationAcceptedTemplate(event, workspaceUrl),
        };

        await this.transporter.sendMail(mailOptions);
    }

    private getInvitationAcceptedTemplate(event: WorkspaceInvitationAcceptedEvent, workspaceUrl: string): string {
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
                        .info-box {
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
                        <h1>🎉 Convite Aceito!</h1>
                    </div>
                    <div class="content">
                        <p>Ótimas notícias!</p>
                        
                        <div class="info-box">
                            <p><strong>${event.memberName}</strong> (${event.memberEmail}) aceitou seu convite para participar do workspace:</p>
                            <h2 style="margin: 10px 0;">📂 ${event.workspaceName}</h2>
                        </div>
                        
                        <p>Agora vocês podem colaborar juntos nos projetos do workspace!</p>
                        
                        <center>
                            <a href="${workspaceUrl}" class="button">
                                Ver Workspace
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
}