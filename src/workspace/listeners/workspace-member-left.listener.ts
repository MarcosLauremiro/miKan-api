// src/workspace/listeners/workspace-member-left.listener.ts
import 'dotenv/config';
import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import * as nodemailer from 'nodemailer';
import { WorkspaceMemberLeftEvent } from '../event/workspace-member-left.event';

@Injectable()
export class WorkspaceMemberLeftListener {
    private readonly logger = new Logger(WorkspaceMemberLeftListener.name);
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

    @OnEvent('workspace.member.left', { async: true })
    async handleMemberLeft(event: WorkspaceMemberLeftEvent) {
        this.logger.log(`📧 Enviando confirmação de saída do workspace para: ${event.memberEmail}`);

        try {
            await this.sendMemberLeftEmail(event);
            this.logger.log(`✅ Confirmação enviada com sucesso para: ${event.memberEmail}`);
        } catch (error) {
            this.logger.error(`❌ Erro ao enviar confirmação para ${event.memberEmail}:`, error.message);
        }
    }

    private async sendMemberLeftEmail(event: WorkspaceMemberLeftEvent): Promise<void> {
        const mailOptions = {
            from: `"${process.env.APP_NAME || 'Seu App'}" <${process.env.GMAIL_USER}>`,
            to: event.memberEmail,
            subject: `Você saiu do workspace ${event.workspaceName}`,
            html: this.getMemberLeftEmailTemplate(event),
        };

        await this.transporter.sendMail(mailOptions);
    }

    private getMemberLeftEmailTemplate(event: WorkspaceMemberLeftEvent): string {
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
                            background: linear-gradient(135deg, #6b7280 0%, #4b5563 100%);
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
                            border-left: 4px solid #6b7280;
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
                        <h1>👋 Até logo!</h1>
                    </div>
                    <div class="content">
                        <p>Olá <strong>${event.memberName}</strong>,</p>
                        
                        <p>Confirmamos que você saiu do workspace:</p>
                        
                        <div class="info-box">
                            <h2 style="margin-top: 0;">📂 ${event.workspaceName}</h2>
                        </div>
                        
                        <p>Você não terá mais acesso aos projetos e tarefas deste workspace.</p>
                        
                        <p>Esperamos vê-lo novamente em breve! Se você quiser retornar, peça a um administrador para convidá-lo novamente.</p>
                        
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