import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type UserDocument = User & Document;

@Schema({
  timestamps: true,
  toJSON: {
    transform: function (doc: any, ret: any) {
      // Remove passwordHash from JSON output
      delete ret.passwordHash;
      return ret;
    },
  },
})
export class User {
  @Prop({ required: true, lowercase: true })
  email: string;

  @Prop({ required: true, select: false }) // Never include in queries by default
  passwordHash: string;

  @Prop({ required: true, trim: true })
  name: string;

  @Prop({
    type: String,
    enum: ['user', 'admin'],
    default: 'user',
  })
  role: 'user' | 'admin';

  @Prop({
    type: String,
    default: null,
    validate: {
      validator: function (v: string) {
        if (!v) return true; // Allow null/empty
        // Basic URL validation
        return /^https?:\/\/.+/.test(v);
      },
      message: 'avatarUrl must be a valid URL',
    },
  })
  avatarUrl?: string;

  @Prop({ default: true })
  isActive: boolean;

  @Prop()
  lastLoginAt?: Date;
}

export const UserSchema = SchemaFactory.createForClass(User);

// Create indexes
UserSchema.index({ email: 1 }, { unique: true });
UserSchema.index({ role: 1 });
UserSchema.index({ isActive: 1 });
UserSchema.index({ createdAt: -1 });
