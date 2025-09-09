import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  Req,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
  ApiUnauthorizedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiCreatedResponse,
  ApiBadRequestResponse,
} from '@nestjs/swagger';
import { MessagesService } from './messages.service';
import { CreateMessageDto } from './dto/create-message.dto';
import { UpdateMessageDto } from './dto/update-message.dto';
import { MessageResponseDto } from './dto/message-response.dto';
import { MessagesQueryDto } from './dto/messages-query.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RoomMemberGuard } from '../rooms/guards/room-member.guard';
import { RbacGuard } from '../../common/guards/rbac.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User, UserDocument } from '../users/schemas/user.schema';

@ApiTags('Messages')
@Controller('rooms/:roomId/messages')
@UseGuards(JwtAuthGuard, RbacGuard)
@ApiBearerAuth('bearerAuth')
export class MessagesController {
  constructor(private readonly messagesService: MessagesService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Send a message to a room',
    description:
      'Send a new message to the specified room. User must be a member of the room.',
  })
  @ApiParam({
    name: 'roomId',
    description: 'Room ID',
    example: '507f1f77bcf86cd799439011',
  })
  @ApiCreatedResponse({
    description: 'Message sent successfully',
    type: MessageResponseDto,
  })
  @ApiUnauthorizedResponse({
    description: 'Invalid or missing access token',
  })
  @ApiForbiddenResponse({
    description: 'You are not a member of this room',
  })
  @ApiNotFoundResponse({
    description: 'Room not found',
  })
  @ApiBadRequestResponse({
    description: 'Invalid message data',
  })
  async sendMessage(
    @Param('roomId') roomId: string,
    @Body() createMessageDto: CreateMessageDto,
    @CurrentUser() user: UserDocument,
    @Req() request: any,
  ): Promise<MessageResponseDto> {
    const clientIP = request.ip || request.connection.remoteAddress;
    return this.messagesService.sendMessage(
      roomId,
      createMessageDto,
      user,
      clientIP,
    );
  }

  @Get()
  @ApiOperation({
    summary: 'Get messages from a room',
    description:
      'Retrieve messages from the specified room with pagination. User must be a member of the room.',
  })
  @ApiParam({
    name: 'roomId',
    description: 'Room ID',
    example: '507f1f77bcf86cd799439011',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Page number (default: 1)',
    example: 1,
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Number of messages per page (default: 20, max: 100)',
    example: 20,
  })
  @ApiQuery({
    name: 'cursor',
    required: false,
    type: String,
    description: 'Message ID for cursor-based pagination',
    example: '507f1f77bcf86cd799439011',
  })
  @ApiOkResponse({
    description: 'Messages retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        messages: {
          type: 'array',
          items: { $ref: '#/components/schemas/MessageResponseDto' },
        },
        total: { type: 'number', example: 100 },
        page: { type: 'number', example: 1 },
        limit: { type: 'number', example: 20 },
        totalPages: { type: 'number', example: 5 },
        hasNext: { type: 'boolean', example: true },
        hasPrev: { type: 'boolean', example: false },
      },
    },
  })
  @ApiUnauthorizedResponse({
    description: 'Invalid or missing access token',
  })
  @ApiForbiddenResponse({
    description: 'You are not a member of this room',
  })
  @ApiNotFoundResponse({
    description: 'Room not found',
  })
  async getMessages(
    @Param('roomId') roomId: string,
    @Query() query: MessagesQueryDto,
    @CurrentUser() user: UserDocument,
  ) {
    return this.messagesService.getMessages(roomId, query, user);
  }
}

@ApiTags('Messages')
@Controller('messages')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('bearerAuth')
export class MessagesControllerDirect {
  constructor(private readonly messagesService: MessagesService) {}

  @Get(':id')
  @ApiOperation({
    summary: 'Get a message by ID',
    description:
      'Retrieve a specific message by its ID. User must be a member of the room.',
  })
  @ApiParam({
    name: 'id',
    description: 'Message ID',
    example: '507f1f77bcf86cd799439011',
  })
  @ApiOkResponse({
    description: 'Message retrieved successfully',
    type: MessageResponseDto,
  })
  @ApiUnauthorizedResponse({
    description: 'Invalid or missing access token',
  })
  @ApiForbiddenResponse({
    description: 'You are not a member of this room',
  })
  @ApiNotFoundResponse({
    description: 'Message not found',
  })
  async getMessageById(
    @Param('id') id: string,
    @CurrentUser() user: UserDocument,
  ): Promise<MessageResponseDto> {
    return this.messagesService.getMessageById(id, user);
  }

  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Update a message',
    description:
      'Update a message content. Users can only edit their own messages.',
  })
  @ApiParam({
    name: 'id',
    description: 'Message ID',
    example: '507f1f77bcf86cd799439011',
  })
  @ApiOkResponse({
    description: 'Message updated successfully',
    type: MessageResponseDto,
  })
  @ApiUnauthorizedResponse({
    description: 'Invalid or missing access token',
  })
  @ApiForbiddenResponse({
    description: 'You can only edit your own messages',
  })
  @ApiNotFoundResponse({
    description: 'Message not found',
  })
  @ApiBadRequestResponse({
    description: 'Invalid message data',
  })
  async updateMessage(
    @Param('id') id: string,
    @Body() updateMessageDto: UpdateMessageDto,
    @CurrentUser() user: UserDocument,
  ): Promise<MessageResponseDto> {
    return this.messagesService.updateMessage(id, updateMessageDto, user);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Delete a message',
    description:
      'Delete a message (soft delete). Users can only delete their own messages.',
  })
  @ApiParam({
    name: 'id',
    description: 'Message ID',
    example: '507f1f77bcf86cd799439011',
  })
  @ApiOkResponse({
    description: 'Message deleted successfully',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: 'Message deleted successfully' },
      },
    },
  })
  @ApiUnauthorizedResponse({
    description: 'Invalid or missing access token',
  })
  @ApiForbiddenResponse({
    description: 'You can only delete your own messages',
  })
  @ApiNotFoundResponse({
    description: 'Message not found',
  })
  async deleteMessage(
    @Param('id') id: string,
    @CurrentUser() user: UserDocument,
  ): Promise<{ message: string }> {
    return this.messagesService.deleteMessage(id, user);
  }
}
