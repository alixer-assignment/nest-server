import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Injectable, Logger, UseGuards } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { MessagesService } from '../../modules/messages/messages.service';
import { RoomsService } from '../../modules/rooms/rooms.service';
import { KafkaService } from '../kafka/kafka.service';
import { PresenceService } from './services/presence.service';
import { WebSocketAuthGuard } from './guards/websocket-auth.guard';
import { WebSocketRoomGuard } from './guards/websocket-room.guard';
import { CacheService } from '../cache/cache.service';
import { RateLimitService } from '../rate-limit/rate-limit.service';
import { SessionService } from '../session/session.service';
import {
  JoinRoomDto,
  LeaveRoomDto,
  TypingDto,
  SendMessageDto,
  ReadReceiptDto,
  MessageCreatedEvent,
  MessageUpdatedEvent,
  MessageDeletedEvent,
  TypingEvent,
  PresenceEvent,
  ReadReceiptEvent,
} from './dto/websocket-events.dto';

@Injectable()
@WebSocketGateway({
  cors: {
    origin: '*',
  },
  namespace: '/chat',
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(ChatGateway.name);
  private readonly typingUsers = new Map<string, Set<string>>(); // roomId -> Set of userIds
  private readonly heartbeatIntervals = new Map<string, NodeJS.Timeout>(); // userId -> interval

  constructor(
    private jwtService: JwtService,
    private configService: ConfigService,
    private messagesService: MessagesService,
    private roomsService: RoomsService,
    private kafkaService: KafkaService,
    private presenceService: PresenceService,
    private cacheService: CacheService,
    private rateLimitService: RateLimitService,
    private sessionService: SessionService,
  ) {}

  async handleConnection(client: Socket) {
    try {
      // Check WebSocket rate limit
      const clientIP = client.handshake.address;
      const rateLimit =
        await this.rateLimitService.checkWebSocketRateLimit(clientIP);
      if (!rateLimit.allowed) {
        this.logger.warn(`WebSocket rate limit exceeded for IP ${clientIP}`);
        client.disconnect();
        return;
      }

      // Authenticate user
      const token = this.extractTokenFromSocket(client);
      if (!token) {
        client.disconnect();
        return;
      }

      // Check if token is blacklisted
      const isBlacklisted =
        await this.sessionService.isRefreshTokenBlacklisted(token);
      if (isBlacklisted) {
        this.logger.warn('Blacklisted token attempted connection');
        client.disconnect();
        return;
      }

      const payload = await this.jwtService.verifyAsync(token, {
        secret: this.configService.get('jwt.accessSecret'),
      });

      client.data.user = payload;
      const userId = payload.sub || payload._id;

      // Set user as online with caching
      const presence = {
        status: 'online',
        socketId: client.id,
        lastSeen: new Date().toISOString(),
        connectedAt: new Date().toISOString(),
      };

      await this.presenceService.setUserOnline(userId, client.id);
      await this.cacheService.cacheUserPresence(userId, presence);

      // Start heartbeat for this user
      this.startUserHeartbeat(userId, client);

      this.logger.log(`User ${userId} connected with socket ${client.id}`);

      // Join user to their rooms
      const userRooms = await this.presenceService.getUserRooms(userId);
      for (const roomId of userRooms) {
        await client.join(`room:${roomId}`);
      }

      // Notify rooms about user coming online
      for (const roomId of userRooms) {
        this.server.to(`room:${roomId}`).emit('presence', {
          userId,
          userName: payload.name || 'Unknown User',
          status: 'online',
          roomId,
        } as PresenceEvent);
      }
    } catch (error) {
      this.logger.error('Connection error:', error);
      client.disconnect();
    }
  }

  async handleDisconnect(client: Socket) {
    try {
      const user = client.data.user;
      if (!user) return;

      const userId = user.sub || user._id;
      const userName = user.name || 'Unknown User';

      // Stop heartbeat for this user
      this.stopUserHeartbeat(userId);

      // Update presence to offline
      const presence = {
        status: 'offline',
        lastSeen: new Date().toISOString(),
        disconnectedAt: new Date().toISOString(),
      };

      await this.cacheService.cacheUserPresence(userId, presence);

      // Clean up user data
      await this.presenceService.cleanupUserData(userId);

      this.logger.log(`User ${userId} disconnected`);

      // Notify rooms about user going offline
      const userRooms = await this.presenceService.getUserRooms(userId);
      for (const roomId of userRooms) {
        this.server.to(`room:${roomId}`).emit('presence', {
          userId,
          userName,
          status: 'offline',
          roomId,
        } as PresenceEvent);
      }
    } catch (error) {
      this.logger.error('Disconnect error:', error);
    }
  }

  @UseGuards(WebSocketAuthGuard, WebSocketRoomGuard)
  @SubscribeMessage('join_room')
  async handleJoinRoom(
    @MessageBody() data: JoinRoomDto,
    @ConnectedSocket() client: Socket,
  ) {
    try {
      const user = client.data.user;
      const userId = user.sub || user._id;
      const roomId = data.roomId;

      // Join socket to room
      await client.join(`room:${roomId}`);

      // Add user to room in Redis
      await this.presenceService.addUserToRoom(userId, roomId);

      this.logger.log(`User ${userId} joined room ${roomId}`);

      // Notify room about user joining
      this.server.to(`room:${roomId}`).emit('presence', {
        userId,
        userName: user.name || 'Unknown User',
        status: 'online',
        roomId,
      } as PresenceEvent);
    } catch (error) {
      this.logger.error('Join room error:', error);
      client.emit('error', { message: 'Failed to join room' });
    }
  }

  @UseGuards(WebSocketAuthGuard, WebSocketRoomGuard)
  @SubscribeMessage('leave_room')
  async handleLeaveRoom(
    @MessageBody() data: LeaveRoomDto,
    @ConnectedSocket() client: Socket,
  ) {
    try {
      const user = client.data.user;
      const userId = user.sub || user._id;
      const roomId = data.roomId;

      // Leave socket from room
      await client.leave(`room:${roomId}`);

      // Remove user from room in Redis
      await this.presenceService.removeUserFromRoom(userId, roomId);

      this.logger.log(`User ${userId} left room ${roomId}`);

      // Notify room about user leaving
      this.server.to(`room:${roomId}`).emit('presence', {
        userId,
        userName: user.name || 'Unknown User',
        status: 'offline',
        roomId,
      } as PresenceEvent);
    } catch (error) {
      this.logger.error('Leave room error:', error);
      client.emit('error', { message: 'Failed to leave room' });
    }
  }

  @UseGuards(WebSocketAuthGuard, WebSocketRoomGuard)
  @SubscribeMessage('typing')
  async handleTyping(
    @MessageBody() data: TypingDto,
    @ConnectedSocket() client: Socket,
  ) {
    try {
      const user = client.data.user;
      const userId = user.sub || user._id;
      const roomId = data.roomId;
      const isTyping = data.isTyping;

      if (isTyping) {
        // Add user to typing list
        if (!this.typingUsers.has(roomId)) {
          this.typingUsers.set(roomId, new Set());
        }
        this.typingUsers.get(roomId)!.add(userId);

        // Set timeout to remove user from typing list after 3 seconds
        setTimeout(() => {
          this.typingUsers.get(roomId)?.delete(userId);
          this.server.to(`room:${roomId}`).emit('typing', {
            userId,
            userName: user.name || 'Unknown User',
            roomId,
            isTyping: false,
          } as TypingEvent);
        }, 3000);
      } else {
        // Remove user from typing list
        this.typingUsers.get(roomId)?.delete(userId);
      }

      // Notify room about typing status
      this.server.to(`room:${roomId}`).emit('typing', {
        userId,
        userName: user.name || 'Unknown User',
        roomId,
        isTyping,
      } as TypingEvent);
    } catch (error) {
      this.logger.error('Typing error:', error);
      client.emit('error', { message: 'Failed to update typing status' });
    }
  }

  @UseGuards(WebSocketAuthGuard, WebSocketRoomGuard)
  @SubscribeMessage('send_message')
  async handleSendMessage(
    @MessageBody() data: SendMessageDto,
    @ConnectedSocket() client: Socket,
  ) {
    try {
      const user = client.data.user;
      const userId = user.sub || user._id;
      const roomId = data.roomId;
      const clientIP = client.handshake.address;

      // Send message using MessagesService with rate limiting
      const message = await this.messagesService.sendMessage(
        roomId,
        { body: data.body },
        user,
        clientIP,
      );

      // Emit message to room
      this.server.to(`room:${roomId}`).emit('message_created', {
        message,
        roomId,
      } as MessageCreatedEvent);

      this.logger.log(`Message sent by ${userId} in room ${roomId}`);
    } catch (error) {
      this.logger.error('Send message error:', error);
      client.emit('error', { message: 'Failed to send message' });
    }
  }

  @UseGuards(WebSocketAuthGuard, WebSocketRoomGuard)
  @SubscribeMessage('read_receipt')
  async handleReadReceipt(
    @MessageBody() data: ReadReceiptDto,
    @ConnectedSocket() client: Socket,
  ) {
    try {
      const user = client.data.user;
      const userId = user.sub || user._id;
      const roomId = data.roomId;
      const messageId = data.messageId;

      // Emit read receipt to room
      this.server.to(`room:${roomId}`).emit('read_receipt', {
        userId,
        userName: user.name || 'Unknown User',
        roomId,
        messageId: messageId || 'latest',
        readAt: new Date(),
      } as ReadReceiptEvent);

      this.logger.log(`Read receipt from ${userId} in room ${roomId}`);
    } catch (error) {
      this.logger.error('Read receipt error:', error);
      client.emit('error', { message: 'Failed to send read receipt' });
    }
  }

  // Helper methods for external services to emit events
  async emitMessageCreated(roomId: string, message: any) {
    this.server.to(`room:${roomId}`).emit('message_created', {
      message,
      roomId,
    } as MessageCreatedEvent);
  }

  async emitMessageUpdated(roomId: string, message: any) {
    this.server.to(`room:${roomId}`).emit('message_updated', {
      message,
      roomId,
    } as MessageUpdatedEvent);
  }

  async emitMessageDeleted(roomId: string, messageId: string) {
    this.server.to(`room:${roomId}`).emit('message_deleted', {
      messageId,
      roomId,
    } as MessageDeletedEvent);
  }

  async emitPresence(
    roomId: string,
    userId: string,
    userName: string,
    status: 'online' | 'offline',
  ) {
    this.server.to(`room:${roomId}`).emit('presence', {
      userId,
      userName,
      status,
      roomId,
    } as PresenceEvent);
  }

  /**
   * Start heartbeat for a user
   */
  private startUserHeartbeat(userId: string, client: Socket): void {
    // Clear existing heartbeat if any
    this.stopUserHeartbeat(userId);

    // Set up heartbeat interval (every 20 seconds)
    const interval = setInterval(async () => {
      try {
        // Check if socket is still connected
        if (!client.connected) {
          this.stopUserHeartbeat(userId);
          return;
        }

        // Update user presence heartbeat
        const presence = {
          status: 'online',
          socketId: client.id,
          lastSeen: new Date().toISOString(),
          heartbeatAt: new Date().toISOString(),
        };

        await this.cacheService.updateUserHeartbeat(userId, presence);
        await this.presenceService.setUserOnline(userId, client.id);

        // Emit ping to client
        client.emit('ping');
      } catch (error) {
        this.logger.error(`Heartbeat error for user ${userId}:`, error);
        this.stopUserHeartbeat(userId);
      }
    }, 20000); // 20 seconds

    this.heartbeatIntervals.set(userId, interval);
  }

  /**
   * Stop heartbeat for a user
   */
  private stopUserHeartbeat(userId: string): void {
    const interval = this.heartbeatIntervals.get(userId);
    if (interval) {
      clearInterval(interval);
      this.heartbeatIntervals.delete(userId);
    }
  }

  /**
   * Handle ping from client
   */
  @SubscribeMessage('pong')
  async handlePong(@ConnectedSocket() client: Socket) {
    try {
      const user = client.data.user;
      if (!user) return;

      const userId = user.sub || user._id;

      // Update heartbeat timestamp
      const presence = {
        status: 'online',
        socketId: client.id,
        lastSeen: new Date().toISOString(),
        pongReceivedAt: new Date().toISOString(),
      };

      await this.cacheService.updateUserHeartbeat(userId, presence);
    } catch (error) {
      this.logger.error('Pong handling error:', error);
    }
  }

  private extractTokenFromSocket(client: Socket): string | undefined {
    const authHeader = client.handshake.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      return authHeader.substring(7);
    }

    // Also check query parameters
    const token = client.handshake.query.token as string;
    return token;
  }
}
