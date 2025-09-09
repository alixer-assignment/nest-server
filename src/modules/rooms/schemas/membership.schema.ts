import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type MembershipDocument = Membership & Document;

@Schema({
  timestamps: true,
  toJSON: {
    transform: function (doc: any, ret: any) {
      ret._id = ret._id.toString();
      ret.roomId = ret.roomId.toString();
      ret.userId = ret.userId.toString();
      if (ret.lastReadMessageId) {
        ret.lastReadMessageId = ret.lastReadMessageId.toString();
      }
      return ret;
    },
  },
})
export class Membership {
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
  userId: Types.ObjectId;

  @Prop({
    type: String,
    enum: ['owner', 'moderator', 'member'],
    default: 'member',
  })
  role: 'owner' | 'moderator' | 'member';

  @Prop({
    type: Date,
    default: Date.now,
  })
  joinedAt: Date;

  @Prop({
    type: Types.ObjectId,
    ref: 'Message',
    default: null,
  })
  lastReadMessageId?: Types.ObjectId;

  @Prop({
    type: Date,
    default: Date.now,
  })
  lastSeenAt: Date;
}

export const MembershipSchema = SchemaFactory.createForClass(Membership);

// Create indexes
MembershipSchema.index({ roomId: 1, userId: 1 }, { unique: true });
MembershipSchema.index({ userId: 1 });
MembershipSchema.index({ roomId: 1 });
MembershipSchema.index({ role: 1 });
MembershipSchema.index({ joinedAt: -1 });
