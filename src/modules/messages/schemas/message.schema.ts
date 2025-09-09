import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type MessageDocument = Message & Document;

@Schema({
  timestamps: true,
  toJSON: {
    transform: function (doc: any, ret: any) {
      ret._id = ret._id.toString();
      ret.roomId = ret.roomId.toString();
      ret.senderId = ret.senderId.toString();
      if (ret.meta?.sentiment) {
        ret.meta.sentiment = ret.meta.sentiment;
      }
      return ret;
    },
  },
})
export class Message {
  @Prop({
    type: Types.ObjectId,
    ref: 'Room',
    required: true,
  })
  roomId: Types.ObjectId;

  @Prop({
    type: Types.ObjectId,
    ref: 'User',
    required: true,
  })
  senderId: Types.ObjectId;

  @Prop({
    required: true,
    trim: true,
    minlength: 1,
    maxlength: 2000,
  })
  body: string;

  @Prop({
    type: {
      sentiment: {
        type: String,
        enum: ['positive', 'negative', 'neutral'],
        default: 'neutral',
      },
      flagged: {
        type: Boolean,
        default: false,
      },
      reasons: {
        type: [String],
        default: [],
      },
    },
    default: {
      sentiment: 'neutral',
      flagged: false,
      reasons: [],
    },
  })
  meta: {
    sentiment: 'positive' | 'negative' | 'neutral';
    flagged: boolean;
    reasons: string[];
  };

  @Prop({
    type: Date,
    default: null,
  })
  editedAt?: Date;

  @Prop({
    type: Date,
    default: null,
  })
  deletedAt?: Date;
}

export const MessageSchema = SchemaFactory.createForClass(Message);

// Create indexes
MessageSchema.index({ roomId: 1, createdAt: -1 });
MessageSchema.index({ senderId: 1 });
MessageSchema.index({ 'meta.flagged': 1 });
MessageSchema.index({ deletedAt: 1 });
MessageSchema.index({ roomId: 1, deletedAt: 1 }); // Compound index for soft delete queries
