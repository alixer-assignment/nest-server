import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type RoomDocument = Room & Document;

@Schema({
  timestamps: true,
  toJSON: {
    transform: function (doc: any, ret: any) {
      ret._id = ret._id.toString();
      return ret;
    },
  },
})
export class Room {
  @Prop({
    type: String,
    enum: ['dm', 'channel'],
    required: true,
  })
  type: 'dm' | 'channel';

  @Prop({
    required: true,
    trim: true,
    minlength: 1,
    maxlength: 100,
  })
  name: string;

  @Prop({
    type: Boolean,
    default: false,
  })
  isPrivate: boolean;

  @Prop({
    type: Types.ObjectId,
    ref: 'User',
    required: true,
  })
  createdBy: Types.ObjectId;

  @Prop({
    type: Number,
    default: 0,
    min: 0,
  })
  membersCount: number;
}

export const RoomSchema = SchemaFactory.createForClass(Room);

// Create indexes
RoomSchema.index({ type: 1 });
RoomSchema.index({ createdBy: 1 });
RoomSchema.index({ isPrivate: 1 });
RoomSchema.index({ createdAt: -1 });
RoomSchema.index({ name: 'text' }); // Text search index
