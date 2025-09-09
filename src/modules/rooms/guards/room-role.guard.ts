import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RoomsService } from '../rooms.service';
import { ROOM_ROLES_KEY } from '../decorators/room-roles.decorator';

@Injectable()
export class RoomRoleGuard implements CanActivate {
  constructor(
    private roomsService: RoomsService,
    private reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(
      ROOM_ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredRoles) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const roomId = request.params.id || request.params.roomId;
    const user = request.user;

    if (!roomId || !user) {
      throw new ForbiddenException('Room ID and user information required');
    }

    const userRole = await this.roomsService.getUserRole(
      roomId,
      user.sub || user._id,
    );

    if (!userRole) {
      throw new ForbiddenException('You are not a member of this room');
    }

    const hasRole = requiredRoles.includes(userRole);

    if (!hasRole) {
      throw new ForbiddenException(
        `Required roles: ${requiredRoles.join(', ')}. Your role: ${userRole}`,
      );
    }

    return true;
  }
}
