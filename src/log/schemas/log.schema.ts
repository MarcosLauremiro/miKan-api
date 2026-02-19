import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: true })
export class Log extends Document {
  @Prop({ required: true, enum: ['audit', 'system'] })
  type: string;

  @Prop({ required: true })
  action: string;

  @Prop({ required: true })
  module: string;

  @Prop({ required: true })
  entity: string;

  @Prop({ required: true })
  entityId: string;

  @Prop()
  workspaceId: string;

  @Prop()
  projectId: string;

  @Prop({
    type: {
      id: String,
      email: String,
      role: String,
    },
  })
  actor: {
    id: string;
    email?: string;
    role?: string;
  };

  @Prop({
    type: {
      before: Object,
      after: Object,
    },
  })
  changes: {
    before?: any;
    after?: any;
  };

  @Prop({ type: Object })
  metadata: Record<string, any>;

  @Prop()
  ip: string;

  @Prop()
  userAgent: string;
}

export const LogSchema = SchemaFactory.createForClass(Log);