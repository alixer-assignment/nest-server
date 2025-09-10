import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Room, RoomSchema } from './schemas/room.schema';
import { Membership, MembershipSchema } from './schemas/membership.schema';
import { User, UserSchema } from '../users/schemas/user.schema';
import { RoomsController } from './rooms.controller';
import { RoomsService } from './rooms.service';
import { RoomMemberGuard } from './guards/room-member.guard';
import { RoomRoleGuard } from './guards/room-role.guard';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Room.name, schema: RoomSchema },
      { name: Membership.name, schema: MembershipSchema },
      { name: User.name, schema: UserSchema },
    ]),
    AuthModule,
  ],
  controllers: [RoomsController],
  providers: [RoomsService, RoomMemberGuard, RoomRoleGuard],
  exports: [RoomsService, MongooseModule],
})
export class RoomsModule {}
