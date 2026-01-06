// src/workspace/listeners/workspace-member-removed.listener.ts
import 'dotenv/config';
import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { WorkspaceMemberRemovedEvent } from '../event/workspace-member-removed.event';
import * as nodemailer from 'nodemailer';

@Injectable()
export class WorkspaceMemberRemovedListener {
    private readonly logger = new Logger(WorkspaceMemberRemovedListener.name);
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

    @OnEvent('workspace.member.removed', { async: true })
    async handleMemberRemoved(event: WorkspaceMemberRemovedEvent) {
        this.logger.log(`📧 Enviando notificação de remoção para: ${event.memberEmail}`);

        try {
            await this.sendMemberRemovedEmail(event);
            this.logger.log(`✅ Notificação enviada com sucesso para: ${event.memberEmail}`);
        } catch (error) {
            this.logger.error(`❌ Erro ao enviar notificação para ${event.memberEmail}:`, error.message);
        }
    }

    private async sendMemberRemovedEmail(event: WorkspaceMemberRemovedEvent): Promise<void> {
        const mailOptions = {
            from: `"${process.env.APP_NAME || 'Seu App'}" <${process.env.GMAIL_USER}>`,
            to: event.memberEmail,
            subject: `Você foi removido do workspace ${event.workspaceName}`,
            html: this.getMemberRemovedEmailTemplate(event),
        };

        await this.transporter.sendMail(mailOptions);
    }

    private getMemberRemovedEmailTemplate(event: WorkspaceMemberRemovedEvent): string {
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
                            background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
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
                            border-left: 4px solid #ef4444;
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
                        <h1>👋 Remoção do Workspace</h1>
                    </div>
                    <div class="content">
                        <p>Olá <strong>${event.memberName}</strong>,</p>
                        
                        <p>Informamos que você foi removido do workspace:</p>
                        
                        <div class="info-box">
                            <h2 style="margin-top: 0;">📂 ${event.workspaceName}</h2>
                        </div>
                        
                        <p>Você não terá mais acesso aos projetos e tarefas deste workspace.</p>
                        
                        <p>Se você acredita que isso foi um erro, entre em contato com os administradores do workspace.</p>
                        
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