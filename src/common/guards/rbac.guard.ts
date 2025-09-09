import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RoomsService } from '../../modules/rooms/rooms.service';
import { LoggingService } from '../logging/logging.service';

export enum RoomRole {
  OWNER = 'owner',
  MODERATOR = 'moderator',
  MEMBER = 'member',
}

export const ROLES_KEY = 'roles';
export const RequireRoomRole =
  (roles: RoomRole[]) =>
  (target: any, propertyKey: string, descriptor: PropertyDescriptor) => {
    Reflect.defineMetadata(ROLES_KEY, roles, descriptor.value);
  };

@Injectable()
export class RbacGuard implements CanActivate {
  private readonly logger = new Logger(RbacGuard.name);

  constructor(
    private reflector: Reflector,
    private roomsService: RoomsService,
    private loggingService: LoggingService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new UnauthorizedException('User not authenticated');
    }

    const userId = user.sub || user._id;
    const roomId = this.extractRoomId(request);

    if (!roomId) {
      throw new ForbiddenException('Room ID is required');
    }

    // Check if user is a member of the room
    const isMember = await this.roomsService.isMember(roomId, userId);
    if (!isMember) {
      await this.loggingService.logSecurityEvent(
        'unauthorized_access',
        userId,
        request.ip,
        request.get('User-Agent'),
        {
          action: 'room_access_denied',
          roomId,
          reason: 'not_member',
        },
      );

      throw new ForbiddenException('You are not a member of this room');
    }

    // Check specific role requirements
    const requiredRoles = this.reflector.getAllAndOverride<RoomRole[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (requiredRoles && requiredRoles.length > 0) {
      const userRole = await this.getUserRoomRole(roomId, userId);

      if (!userRole || !requiredRoles.includes(userRole)) {
        await this.loggingService.logSecurityEvent(
          'unauthorized_access',
          userId,
          request.ip,
          request.get('User-Agent'),
          {
            action: 'insufficient_role',
            roomId,
            userRole,
            requiredRoles,
          },
        );

        throw new ForbiddenException(
          `Insufficient permissions. Required roles: ${requiredRoles.join(', ')}`,
        );
      }
    }

    return true;
  }

  private extractRoomId(request: any): string | null {
    // Try to get room ID from different sources
    return (
      request.params?.roomId ||
      request.params?.id ||
      request.body?.roomId ||
      request.query?.roomId ||
      null
    );
  }

  private async getUserRoomRole(
    roomId: string,
    userId: string,
  ): Promise<RoomRole | null> {
    try {
      // Check if user is a member and get their role
      const isMember = await this.roomsService.isMember(roomId, userId);
      if (!isMember) {
        return null;
      }

      // For now, return MEMBER role - in a real implementation, you'd query the membership table
      return RoomRole.MEMBER;
    } catch (error) {
      this.logger.error(`Error getting user room role: ${error.message}`);
      return null;
    }
  }
}
