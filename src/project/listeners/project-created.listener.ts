// src/project/listeners/project-created.listener.ts
import 'dotenv/config';
import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { ProjectCreatedEvent } from '../event/project-created.event';
import * as nodemailer from 'nodemailer';
import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class ProjectCreatedListener {
    private readonly logger = new Logger(ProjectCreatedListener.name);
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

    @OnEvent('project.created', { async: true })
    async handleProjectCreated(event: ProjectCreatedEvent) {
        // Só notificar se for projeto público e estiver em um workspace
        if (event.isPrivate || !event.workspaceId) {
            this.logger.log(`Projeto ${event.projectName} é privado ou não está em workspace. Notificação não enviada.`);
            return;
        }

        this.logger.log(`📧 Notificando membros do workspace sobre novo projeto: ${event.projectName}`);

        try {
            // Buscar todos os membros do workspace exceto o criador
            const workspaceMembers = await this.prisma.membersWorkspace.findMany({
                where: {
                    workspaceId: event.workspaceId,
                    userId: {
                        not: event.userId // Não enviar para quem criou
                    }
                },
                include: {
                    user: {
                        select: {
                            id: true,
                            name: true,
                            email: true
                        }
                    }
                }
            });

            if (workspaceMembers.length === 0) {
                this.logger.log(`Nenhum membro adicional no workspace para notificar`);
                return;
            }

            // Enviar email para cada membro
            const emailPromises = workspaceMembers.map(member => 
                this.sendProjectCreatedEmail(event, member.user)
            );

            await Promise.allSettled(emailPromises);
            
            this.logger.log(`✅ Notificações enviadas para ${workspaceMembers.length} membro(s)`);
        } catch (error) {
            this.logger.error(`❌ Erro ao enviar notificações:`, error.message);
        }
    }

    private async sendProjectCreatedEmail(event: ProjectCreatedEvent, member: any): Promise<void> {
        try {
            const projectUrl = `${process.env.APP_URL || 'http://localhost:3000'}/projects/${event.projectId}`;
            const workspaceUrl = `${process.env.APP_URL || 'http://localhost:3000'}/workspace/${event.workspaceId}`;

            const mailOptions = {
                from: `"${process.env.APP_NAME || 'Seu App'}" <${process.env.GMAIL_USER}>`,
                to: member.email,
                subject: `Novo projeto criado: ${event.projectName} 📂`,
                html: this.getProjectCreatedEmailTemplate(event, member, projectUrl, workspaceUrl),
            };

            await this.transporter.sendMail(mailOptions);
            this.logger.log(`✅ Email enviado para: ${member.email}`);
        } catch (error) {
            this.logger.error(`❌ Erro ao enviar email para ${member.email}:`, error.message);
            throw error;
        }
    }

    private getProjectCreatedEmailTemplate(
        event: ProjectCreatedEvent, 
        member: any, 
        projectUrl: string, 
        workspaceUrl: string
    ): string {
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
                        .project-card {
                            background: white;
                            padding: 25px;
                            border-radius: 8px;
                            margin: 20px 0;
                            border-left: 4px solid #667eea;
                            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                        }
                        .project-title {
                            margin: 0 0 10px 0;
                            color: #667eea;
                            font-size: 24px;
                        }
                        .project-description {
                            color: #666;
                            margin: 10px 0;
                            line-height: 1.8;
                        }
                        .creator-info {
                            background: #f0f4ff;
                            padding: 15px;
                            border-radius: 6px;
                            margin: 15px 0;
                            display: flex;
                            align-items: center;
                        }
                        .creator-avatar {
                            width: 40px;
                            height: 40px;
                            border-radius: 50%;
                            background: #667eea;
                            color: white;
                            display: flex;
                            align-items: center;
                            justify-content: center;
                            font-weight: bold;
                            margin-right: 12px;
                            font-size: 18px;
                        }
                        .workspace-badge {
                            display: inline-block;
                            padding: 6px 12px;
                            background: #e0e7ff;
                            color: #667eea;
                            border-radius: 20px;
                            font-size: 14px;
                            font-weight: 600;
                            margin-top: 10px;
                        }
                        .button-container {
                            text-align: center;
                            margin: 30px 0;
                        }
                        .button {
                            display: inline-block;
                            padding: 15px 40px;
                            background: #667eea;
                            color: white !important;
                            text-decoration: none;
                            border-radius: 5px;
                            font-weight: bold;
                            margin: 0 10px;
                            transition: background 0.3s;
                        }
                        .button:hover {
                            background: #5568d3;
                        }
                        .button-secondary {
                            background: #6b7280;
                        }
                        .button-secondary:hover {
                            background: #4b5563;
                        }
                        .footer {
                            text-align: center;
                            margin-top: 30px;
                            padding-top: 20px;
                            border-top: 1px solid #e5e7eb;
                            color: #666;
                            font-size: 12px;
                        }
                        .emoji {
                            font-size: 24px;
                            margin-right: 8px;
                        }
                    </style>
                </head>
                <body>
                    <div class="header">
                        <h1><span class="emoji">📂</span>Novo Projeto Criado!</h1>
                    </div>
                    
                    <div class="content">
                        <p>Olá <strong>${member.name}</strong>,</p>
                        
                        <p>Um novo projeto foi criado no seu workspace e está disponível para colaboração:</p>
                        
                        <div class="project-card">
                            <h2 class="project-title">${event.projectName}</h2>
                            
                            <div class="creator-info">
                                <div class="creator-avatar">
                                    ${event.userName.charAt(0).toUpperCase()}
                                </div>
                                <div>
                                    <strong>Criado por:</strong> ${event.userName}<br>
                                    <small style="color: #666;">
                                        ${new Date().toLocaleDateString('pt-BR', { 
                                            day: '2-digit', 
                                            month: 'long', 
                                            year: 'numeric' 
                                        })}
                                    </small>
                                </div>
                            </div>
                            
                            <span class="workspace-badge">
                                📁 ${event.workspaceName}
                            </span>
                        </div>
                        
                        <p>Como membro do workspace <strong>${event.workspaceName}</strong>, você já tem acesso a este projeto e pode começar a colaborar!</p>
                        
                        <div class="button-container">
                            <a href="${projectUrl}" class="button">
                                Ver Projeto
                            </a>
                            <a href="${workspaceUrl}" class="button button-secondary">
                                Ver Workspace
                            </a>
                        </div>
                        
                        <div style="background: #f0f9ff; padding: 15px; border-radius: 6px; margin-top: 20px; border-left: 3px solid #3b82f6;">
                            <strong style="color: #1e40af;">💡 Dica:</strong> 
                            <span style="color: #1e3a8a;">
                                Acesse o projeto para visualizar as listas e tarefas, adicionar comentários e colaborar com sua equipe!
                            </span>
                        </div>
                        
                        <p style="margin-top: 30px;">
                            Atenciosamente,<br>
                            <strong>Equipe ${process.env.APP_NAME || 'do App'}</strong>
                        </p>
                    </div>
                    
                    <div class="footer">
                        <p>Este é um email automático, por favor não responda.</p>
                        <p style="margin-top: 10px;">
                            Para gerenciar suas notificações, acesse as 
                            <a href="${process.env.APP_URL || 'http://localhost:3000'}/settings" 
                               style="color: #667eea; text-decoration: none;">
                                configurações da sua conta
                            </a>
                        </p>
                    </div>
                </body>
            </html>
        `;
    }
}