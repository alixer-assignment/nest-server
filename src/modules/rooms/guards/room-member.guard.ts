import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { RoomsService } from '../rooms.service';

@Injectable()
export class RoomMemberGuard implements CanActivate {
  constructor(private roomsService: RoomsService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const roomId = request.params.id || request.params.roomId;
    const user = request.user;

    if (!roomId || !user) {
      throw new ForbiddenException('Room ID and user information required');
    }

    const isMember = await this.roomsService.isMember(
      roomId,
      user.sub || user._id,
    );

    if (!isMember) {
      throw new ForbiddenException('You are not a member of this room');
    }

    return true;
  }
}
