import { SetMetadata } from '@nestjs/common';

export const ROOM_ROLES_KEY = 'room_roles';
export const RoomRoles = (...roles: string[]) =>
  SetMetadata(ROOM_ROLES_KEY, roles);
