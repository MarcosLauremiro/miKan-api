import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Injectable } from '@nestjs/common';
import { Log } from './schemas/log.schema';

@Injectable()
export class LogService {
  constructor(
    @InjectModel(Log.name, 'logsConnection')
    private logModel: Model<Log>,
  ) {}

  async create(data: Partial<Log>) {
    return this.logModel.create(data);
  }

  async findAll() {
    return this.logModel.find().sort({ createdAt: -1 });
  }

  async findByUser(userId: string) {
    return this.logModel
      .find({ 'actor.id': userId }) // 👈 AQUI
      .sort({ createdAt: -1 })
      .lean();
  }  
}