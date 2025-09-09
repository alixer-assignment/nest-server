import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { WsException } from '@nestjs/websockets';
import { Socket } from 'socket.io';
import { RoomsService } from '../../../modules/rooms/rooms.service';

@Injectable()
export class WebSocketRoomGuard implements CanActivate {
  constructor(private roomsService: RoomsService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const client: Socket = context.switchToWs().getClient();
    const data = context.switchToWs().getData();
    const user = client.data.user;

    if (!user) {
      throw new WsException('User not authenticated');
    }

    const roomId = data.roomId;
    if (!roomId) {
      throw new WsException('Room ID is required');
    }

    const isMember = await this.roomsService.isMember(
      roomId,
      user.sub || user._id,
    );

    if (!isMember) {
      throw new WsException('You are not a member of this room');
    }

    return true;
  }
}
