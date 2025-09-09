import { Injectable } from '@nestjs/common';
import { RedisService } from '../../redis/redis.service';

@Injectable()
export class PresenceService {
  private readonly USER_PRESENCE_KEY = 'user:presence';
  private readonly ROOM_USERS_KEY = 'room:users';
  private readonly USER_ROOMS_KEY = 'user:rooms';

  constructor(private redisService: RedisService) {}

  /**
   * Mark user as online
   */
  async setUserOnline(userId: string, socketId: string): Promise<void> {
    const userData = {
      status: 'online',
      socketId,
      lastSeen: new Date().toISOString(),
    };

    await this.redisService.hset(
      this.USER_PRESENCE_KEY,
      userId,
      JSON.stringify(userData),
    );

    // Set expiration for 24 hours
    await this.redisService.expire(
      `${this.USER_PRESENCE_KEY}:${userId}`,
      86400,
    );
  }

  /**
   * Mark user as offline
   */
  async setUserOffline(userId: string): Promise<void> {
    const userData = {
      status: 'offline',
      lastSeen: new Date().toISOString(),
    };

    await this.redisService.hset(
      this.USER_PRESENCE_KEY,
      userId,
      JSON.stringify(userData),
    );
  }

  /**
   * Get user presence status
   */
  async getUserPresence(userId: string): Promise<{
    status: 'online' | 'offline';
    socketId?: string;
    lastSeen: string;
  } | null> {
    const userData = await this.redisService.hget(
      this.USER_PRESENCE_KEY,
      userId,
    );
    return userData ? JSON.parse(userData) : null;
  }

  /**
   * Add user to room
   */
  async addUserToRoom(userId: string, roomId: string): Promise<void> {
    // Add user to room's user list
    await this.redisService.hset(
      this.ROOM_USERS_KEY,
      `${roomId}:${userId}`,
      '1',
    );

    // Add room to user's room list
    await this.redisService.hset(
      this.USER_ROOMS_KEY,
      `${userId}:${roomId}`,
      '1',
    );
  }

  /**
   * Remove user from room
   */
  async removeUserFromRoom(userId: string, roomId: string): Promise<void> {
    // Remove user from room's user list
    await this.redisService.hdel(this.ROOM_USERS_KEY, `${roomId}:${userId}`);

    // Remove room from user's room list
    await this.redisService.hdel(this.USER_ROOMS_KEY, `${userId}:${roomId}`);
  }

  /**
   * Get all users in a room
   */
  async getRoomUsers(roomId: string): Promise<string[]> {
    const roomUsers = await this.redisService.hgetall(this.ROOM_USERS_KEY);
    return Object.keys(roomUsers)
      .filter((key) => key.startsWith(`${roomId}:`))
      .map((key) => key.split(':')[1]);
  }

  /**
   * Get all rooms for a user
   */
  async getUserRooms(userId: string): Promise<string[]> {
    const userRooms = await this.redisService.hgetall(this.USER_ROOMS_KEY);
    return Object.keys(userRooms)
      .filter((key) => key.startsWith(`${userId}:`))
      .map((key) => key.split(':')[1]);
  }

  /**
   * Get online users in a room
   */
  async getOnlineUsersInRoom(roomId: string): Promise<
    {
      userId: string;
      status: 'online' | 'offline';
      lastSeen: string;
    }[]
  > {
    const roomUsers = await this.getRoomUsers(roomId);
    const onlineUsers: {
      userId: string;
      status: 'online' | 'offline';
      lastSeen: string;
    }[] = [];

    for (const userId of roomUsers) {
      const presence = await this.getUserPresence(userId);
      if (presence) {
        onlineUsers.push({
          userId,
          status: presence.status,
          lastSeen: presence.lastSeen,
        });
      }
    }

    return onlineUsers;
  }

  /**
   * Check if user is online
   */
  async isUserOnline(userId: string): Promise<boolean> {
    const presence = await this.getUserPresence(userId);
    return presence?.status === 'online';
  }

  /**
   * Get user's socket ID
   */
  async getUserSocketId(userId: string): Promise<string | null> {
    const presence = await this.getUserPresence(userId);
    return presence?.socketId || null;
  }

  /**
   * Clean up user data when they disconnect
   */
  async cleanupUserData(userId: string): Promise<void> {
    const userRooms = await this.getUserRooms(userId);

    // Remove user from all rooms
    for (const roomId of userRooms) {
      await this.removeUserFromRoom(userId, roomId);
    }

    // Mark user as offline
    await this.setUserOffline(userId);
  }
}
