import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Room, RoomDocument } from './schemas/room.schema';
import { Membership, MembershipDocument } from './schemas/membership.schema';
import { User, UserDocument } from '../users/schemas/user.schema';
import { CreateRoomDto } from './dto/create-room.dto';
import { UpdateRoomDto } from './dto/update-room.dto';
import { AddMemberDto } from './dto/add-member.dto';
import { UpdateMemberRoleDto } from './dto/update-member-role.dto';
import { RoomResponseDto } from './dto/room-response.dto';
import { MembershipResponseDto } from './dto/membership-response.dto';

@Injectable()
export class RoomsService {
  constructor(
    @InjectModel(Room.name) private roomModel: Model<RoomDocument>,
    @InjectModel(Membership.name)
    private membershipModel: Model<MembershipDocument>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
  ) {}

  /**
   * Create a new room
   */
  async createRoom(
    createRoomDto: CreateRoomDto,
    currentUser: UserDocument,
  ): Promise<RoomResponseDto> {
    const room = new this.roomModel({
      ...createRoomDto,
      createdBy: currentUser._id,
      membersCount: 1,
    });

    const savedRoom = await room.save();

    // Add creator as owner
    await this.membershipModel.create({
      roomId: savedRoom._id,
      userId: currentUser._id,
      role: 'owner',
    });

    return this.toRoomResponse(savedRoom);
  }

  /**
   * Get all rooms for a user
   */
  async getRoomsByUser(
    userId: string,
    page: number = 1,
    limit: number = 10,
  ): Promise<{
    rooms: RoomResponseDto[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const skip = (page - 1) * limit;

    // Get room IDs where user is a member
    const memberships = await this.membershipModel
      .find({ userId: new Types.ObjectId(userId) })
      .select('roomId')
      .exec();

    const roomIds = memberships.map((membership) => membership.roomId);

    const [rooms, total] = await Promise.all([
      this.roomModel
        .find({ _id: { $in: roomIds } })
        .sort({ updatedAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.roomModel.countDocuments({ _id: { $in: roomIds } }).exec(),
    ]);

    return {
      rooms: rooms.map((room) => this.toRoomResponse(room)),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Get room by ID (only if user is a member)
   */
  async getRoomById(roomId: string, userId: string): Promise<RoomResponseDto> {
    // Check if user is a member
    const membership = await this.membershipModel
      .findOne({
        roomId: new Types.ObjectId(roomId),
        userId: new Types.ObjectId(userId),
      })
      .exec();

    if (!membership) {
      throw new ForbiddenException('You are not a member of this room');
    }

    const room = await this.roomModel.findById(roomId).exec();
    if (!room) {
      throw new NotFoundException('Room not found');
    }

    return this.toRoomResponse(room);
  }

  /**
   * Update room (only by owner or moderator)
   */
  async updateRoom(
    roomId: string,
    updateRoomDto: UpdateRoomDto,
    currentUser: UserDocument,
  ): Promise<RoomResponseDto> {
    // Check if user has permission to update
    const membership = await this.membershipModel
      .findOne({
        roomId: new Types.ObjectId(roomId),
        userId: currentUser._id,
      })
      .exec();

    if (!membership) {
      throw new ForbiddenException('You are not a member of this room');
    }

    if (!['owner', 'moderator'].includes(membership.role)) {
      throw new ForbiddenException(
        'Only owners and moderators can update room settings',
      );
    }

    const updatedRoom = await this.roomModel
      .findByIdAndUpdate(
        roomId,
        { ...updateRoomDto, updatedAt: new Date() },
        { new: true, runValidators: true },
      )
      .exec();

    if (!updatedRoom) {
      throw new NotFoundException('Room not found');
    }

    return this.toRoomResponse(updatedRoom);
  }

  /**
   * Add member to room
   */
  async addMember(
    roomId: string,
    addMemberDto: AddMemberDto,
    currentUser: UserDocument,
  ): Promise<MembershipResponseDto> {
    // Check if room exists
    const room = await this.roomModel.findById(roomId).exec();
    if (!room) {
      throw new NotFoundException('Room not found');
    }

    // Check if current user has permission to add members
    const currentMembership = await this.membershipModel
      .findOne({
        roomId: new Types.ObjectId(roomId),
        userId: currentUser._id,
      })
      .exec();

    if (!currentMembership) {
      throw new ForbiddenException('You are not a member of this room');
    }

    if (!['owner', 'moderator'].includes(currentMembership.role)) {
      throw new ForbiddenException(
        'Only owners and moderators can add members',
      );
    }

    // Check if user exists
    const user = await this.userModel.findById(addMemberDto.userId).exec();
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Check if user is already a member
    const existingMembership = await this.membershipModel
      .findOne({
        roomId: new Types.ObjectId(roomId),
        userId: new Types.ObjectId(addMemberDto.userId),
      })
      .exec();

    if (existingMembership) {
      throw new ConflictException('User is already a member of this room');
    }

    // Add member
    const membership = new this.membershipModel({
      roomId: new Types.ObjectId(roomId),
      userId: new Types.ObjectId(addMemberDto.userId),
      role: addMemberDto.role || 'member',
    });

    const savedMembership = await membership.save();

    // Update room member count
    await this.roomModel.findByIdAndUpdate(roomId, {
      $inc: { membersCount: 1 },
    });

    return this.toMembershipResponse(savedMembership);
  }

  /**
   * Remove member from room
   */
  async removeMember(
    roomId: string,
    userId: string,
    currentUser: UserDocument,
  ): Promise<{ message: string }> {
    // Check if room exists
    const room = await this.roomModel.findById(roomId).exec();
    if (!room) {
      throw new NotFoundException('Room not found');
    }

    // Check if current user has permission to remove members
    const currentMembership = await this.membershipModel
      .findOne({
        roomId: new Types.ObjectId(roomId),
        userId: currentUser._id,
      })
      .exec();

    if (!currentMembership) {
      throw new ForbiddenException('You are not a member of this room');
    }

    // Check if target user is a member
    const targetMembership = await this.membershipModel
      .findOne({
        roomId: new Types.ObjectId(roomId),
        userId: new Types.ObjectId(userId),
      })
      .exec();

    if (!targetMembership) {
      throw new NotFoundException('User is not a member of this room');
    }

    // Permission checks
    if ((currentUser._id as any).toString() === userId) {
      // User removing themselves - allowed
    } else if (targetMembership.role === 'owner') {
      throw new ForbiddenException('Cannot remove room owner');
    } else if (currentMembership.role === 'member') {
      throw new ForbiddenException(
        'Only owners and moderators can remove other members',
      );
    } else if (
      currentMembership.role === 'moderator' &&
      targetMembership.role === 'moderator'
    ) {
      throw new ForbiddenException('Moderators cannot remove other moderators');
    }

    // Remove membership
    await this.membershipModel.findByIdAndDelete(targetMembership._id);

    // Update room member count
    await this.roomModel.findByIdAndUpdate(roomId, {
      $inc: { membersCount: -1 },
    });

    return { message: 'Member removed successfully' };
  }

  /**
   * Update member role
   */
  async updateMemberRole(
    roomId: string,
    userId: string,
    updateMemberRoleDto: UpdateMemberRoleDto,
    currentUser: UserDocument,
  ): Promise<MembershipResponseDto> {
    // Check if current user is owner
    const currentMembership = await this.membershipModel
      .findOne({
        roomId: new Types.ObjectId(roomId),
        userId: currentUser._id,
      })
      .exec();

    if (!currentMembership) {
      throw new ForbiddenException('You are not a member of this room');
    }

    if (currentMembership.role !== 'owner') {
      throw new ForbiddenException('Only room owners can change member roles');
    }

    // Check if target user is a member
    const targetMembership = await this.membershipModel
      .findOne({
        roomId: new Types.ObjectId(roomId),
        userId: new Types.ObjectId(userId),
      })
      .exec();

    if (!targetMembership) {
      throw new NotFoundException('User is not a member of this room');
    }

    // Prevent owner from changing their own role
    if ((currentUser._id as any).toString() === userId) {
      throw new ForbiddenException('You cannot change your own role');
    }

    // Update role
    const updatedMembership = await this.membershipModel
      .findByIdAndUpdate(
        targetMembership._id,
        { role: updateMemberRoleDto.role },
        { new: true, runValidators: true },
      )
      .exec();

    return this.toMembershipResponse(updatedMembership!);
  }

  /**
   * Get room members
   */
  async getRoomMembers(
    roomId: string,
    userId: string,
  ): Promise<MembershipResponseDto[]> {
    // Check if user is a member
    const membership = await this.membershipModel
      .findOne({
        roomId: new Types.ObjectId(roomId),
        userId: new Types.ObjectId(userId),
      })
      .exec();

    if (!membership) {
      throw new ForbiddenException('You are not a member of this room');
    }

    const memberships = await this.membershipModel
      .find({ roomId: new Types.ObjectId(roomId) })
      .sort({ joinedAt: 1 })
      .exec();

    return memberships.map((membership) =>
      this.toMembershipResponse(membership),
    );
  }

  /**
   * Check if user is a member of a room
   */
  async isMember(roomId: string, userId: string): Promise<boolean> {
    const membership = await this.membershipModel
      .findOne({
        roomId: new Types.ObjectId(roomId),
        userId: new Types.ObjectId(userId),
      })
      .exec();

    return !!membership;
  }

  /**
   * Get user's role in a room
   */
  async getUserRole(roomId: string, userId: string): Promise<string | null> {
    const membership = await this.membershipModel
      .findOne({
        roomId: new Types.ObjectId(roomId),
        userId: new Types.ObjectId(userId),
      })
      .exec();

    return membership?.role || null;
  }

  /**
   * Convert RoomDocument to RoomResponseDto
   */
  private toRoomResponse(room: RoomDocument): RoomResponseDto {
    return {
      _id: (room._id as any).toString(),
      type: room.type,
      name: room.name,
      isPrivate: room.isPrivate,
      createdBy: (room.createdBy as any).toString(),
      membersCount: room.membersCount,
      createdAt: (room as any).createdAt,
      updatedAt: (room as any).updatedAt,
    };
  }

  /**
   * Convert MembershipDocument to MembershipResponseDto
   */
  private toMembershipResponse(
    membership: MembershipDocument,
  ): MembershipResponseDto {
    return {
      _id: (membership._id as any).toString(),
      roomId: (membership.roomId as any).toString(),
      userId: (membership.userId as any).toString(),
      role: membership.role,
      joinedAt: membership.joinedAt,
      lastReadMessageId: membership.lastReadMessageId
        ? (membership.lastReadMessageId as any).toString()
        : undefined,
      lastSeenAt: membership.lastSeenAt,
    };
  }
}
