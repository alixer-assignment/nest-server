import { IsString, IsMongoId, IsEnum, IsOptional, IsDateString, IsObject, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export enum MessageType {
  MESSAGE_SENT = 'message.sent',
  MESSAGE_MODERATED = 'message.moderated',
  MESSAGE_PERSISTED = 'message.persisted',
}

export class MessageMetadata {
  @IsString()
  id: string;

  @IsMongoId()
  roomId: string;

  @IsMongoId()
  senderId: string;

  @IsString()
  body: string;

  @IsDateString()
  timestamp: string;

  @IsEnum(MessageType)
  type: MessageType;
}

export class ModerationResult {
  @IsString()
  sentiment: 'positive' | 'negative' | 'neutral';

  @IsString()
  flagged: boolean;

  @IsOptional()
  @IsString({ each: true })
  reasons?: string[];

  @IsOptional()
  @IsObject()
  confidence?: {
    sentiment: number;
    flagged: number;
  };
}

export class ModeratedMessage extends MessageMetadata {
  @ValidateNested()
  @Type(() => ModerationResult)
  moderation: ModerationResult;

  @IsOptional()
  @IsString()
  processedAt?: string;
}

export class PersistedMessage extends ModeratedMessage {
  @IsMongoId()
  _id: string;

  @IsDateString()
  createdAt: string;

  @IsDateString()
  updatedAt: string;
}
