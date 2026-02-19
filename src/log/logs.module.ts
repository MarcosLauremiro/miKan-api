import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { LogService } from './logs.service';
import { LogController } from './logs.controller';
import { Log, LogSchema } from './schemas/log.schema';
import { PrismaModule } from '../../prisma/project.module';

@Module({
  imports: [
    MongooseModule.forRoot('mongodb://admin:password123@localhost:27017/mikan?authSource=admin', {
      connectionName: 'logsConnection',
    }),
    MongooseModule.forFeature(
      [{ name: Log.name, schema: LogSchema }],
      'logsConnection',
    ),
    PrismaModule,
  ],
  providers: [LogService],
  controllers: [LogController],
  exports: [LogService],
})
export class LogModule {}

