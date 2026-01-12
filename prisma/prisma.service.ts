import 'dotenv/config'
import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import { PrismaClient } from '../generated/prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  constructor() {
    const connectionString = process.env.DATABASE_URL;

    if (!connectionString) {
      throw new Error('DATABASE_URL não está definida');
    }

    // Cria o pool com a senha explicitamente como string
    const pool = new Pool({
      connectionString,
      // Garante que a senha seja tratada como string
      password: String(process.env.DATABASE_URL?.split(':')[2]?.split('@')[0] || 'postgres')
    });

    const adapter = new PrismaPg(pool);

    super({
      adapter,
    });
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}