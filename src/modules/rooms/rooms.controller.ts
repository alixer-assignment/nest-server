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
  ApiConflictResponse,
  ApiBadRequestResponse,
} from '@nestjs/swagger';
import { RoomsService } from './rooms.service';
import { CreateRoomDto } from './dto/create-room.dto';
import { UpdateRoomDto } from './dto/update-room.dto';
import { AddMemberDto } from './dto/add-member.dto';
import { UpdateMemberRoleDto } from './dto/update-member-role.dto';
import { RoomResponseDto } from './dto/room-response.dto';
import { MembershipResponseDto } from './dto/membership-response.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RoomMemberGuard } from './guards/room-member.guard';
import { RoomRoleGuard } from './guards/room-role.guard';
import { RoomRoles } from './decorators/room-roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User, UserDocument } from '../users/schemas/user.schema';

@ApiTags('Rooms')
@Controller('rooms')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('bearerAuth')
export class RoomsController {
  constructor(private readonly roomsService: RoomsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create a new room',
    description:
      'Create a new room (DM or channel) and add the creator as owner.',
  })
  @ApiCreatedResponse({
    description: 'Room created successfully',
    type: RoomResponseDto,
  })
  @ApiUnauthorizedResponse({
    description: 'Invalid or missing access token',
  })
  @ApiBadRequestResponse({
    description: 'Invalid room data',
  })
  async createRoom(
    @Body() createRoomDto: CreateRoomDto,
    @CurrentUser() user: UserDocument,
  ): Promise<RoomResponseDto> {
    return this.roomsService.createRoom(createRoomDto, user);
  }

  @Get()
  @ApiOperation({
    summary: 'Get user rooms',
    description: 'Retrieve all rooms where the current user is a member.',
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
    description: 'Number of rooms per page (default: 10)',
    example: 10,
  })
  @ApiOkResponse({
    description: 'Rooms retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        rooms: {
          type: 'array',
          items: { $ref: '#/components/schemas/RoomResponseDto' },
        },
        total: { type: 'number', example: 100 },
        page: { type: 'number', example: 1 },
        limit: { type: 'number', example: 10 },
        totalPages: { type: 'number', example: 10 },
      },
    },
  })
  @ApiUnauthorizedResponse({
    description: 'Invalid or missing access token',
  })
  async getRooms(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @CurrentUser() user: UserDocument,
  ) {
    return this.roomsService.getRoomsByUser(
      (user._id as any).toString(),
      page,
      limit,
    );
  }

  @Get(':id')
  @UseGuards(RoomMemberGuard)
  @ApiOperation({
    summary: 'Get room by ID',
    description:
      'Retrieve a specific room by ID. User must be a member of the room.',
  })
  @ApiParam({
    name: 'id',
    description: 'Room ID',
    example: '507f1f77bcf86cd799439011',
  })
  @ApiOkResponse({
    description: 'Room retrieved successfully',
    type: RoomResponseDto,
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
  async getRoomById(
    @Param('id') id: string,
    @CurrentUser() user: UserDocument,
  ): Promise<RoomResponseDto> {
    console.log('id', id);
    console.log('user', user);
    return this.roomsService.getRoomById(id, (user._id as any).toString());
  }

  @Patch(':id')
  @UseGuards(RoomMemberGuard, RoomRoleGuard)
  @RoomRoles('owner', 'moderator')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Update room',
    description:
      'Update room settings. Only owners and moderators can update room settings.',
  })
  @ApiParam({
    name: 'id',
    description: 'Room ID',
    example: '507f1f77bcf86cd799439011',
  })
  @ApiOkResponse({
    description: 'Room updated successfully',
    type: RoomResponseDto,
  })
  @ApiUnauthorizedResponse({
    description: 'Invalid or missing access token',
  })
  @ApiForbiddenResponse({
    description:
      'You are not a member of this room or insufficient permissions',
  })
  @ApiNotFoundResponse({
    description: 'Room not found',
  })
  async updateRoom(
    @Param('id') id: string,
    @Body() updateRoomDto: UpdateRoomDto,
    @CurrentUser() user: UserDocument,
  ): Promise<RoomResponseDto> {
    return this.roomsService.updateRoom(id, updateRoomDto, user);
  }

  @Post(':id/members')
  @UseGuards(RoomMemberGuard, RoomRoleGuard)
  @RoomRoles('owner', 'moderator')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Add member to room',
    description:
      'Add a new member to the room. Only owners and moderators can add members.',
  })
  @ApiParam({
    name: 'id',
    description: 'Room ID',
    example: '507f1f77bcf86cd799439011',
  })
  @ApiCreatedResponse({
    description: 'Member added successfully',
    type: MembershipResponseDto,
  })
  @ApiUnauthorizedResponse({
    description: 'Invalid or missing access token',
  })
  @ApiForbiddenResponse({
    description:
      'You are not a member of this room or insufficient permissions',
  })
  @ApiNotFoundResponse({
    description: 'Room or user not found',
  })
  @ApiConflictResponse({
    description: 'User is already a member of this room',
  })
  async addMember(
    @Param('id') id: string,
    @Body() addMemberDto: AddMemberDto,
    @CurrentUser() user: UserDocument,
  ): Promise<MembershipResponseDto> {
    return this.roomsService.addMember(id, addMemberDto, user);
  }

  @Delete(':id/members/:userId')
  @UseGuards(RoomMemberGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Remove member from room',
    description:
      'Remove a member from the room. Users can remove themselves, owners and moderators can remove others.',
  })
  @ApiParam({
    name: 'id',
    description: 'Room ID',
    example: '507f1f77bcf86cd799439011',
  })
  @ApiParam({
    name: 'userId',
    description: 'User ID to remove',
    example: '507f1f77bcf86cd799439011',
  })
  @ApiOkResponse({
    description: 'Member removed successfully',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: 'Member removed successfully' },
      },
    },
  })
  @ApiUnauthorizedResponse({
    description: 'Invalid or missing access token',
  })
  @ApiForbiddenResponse({
    description:
      'You are not a member of this room or insufficient permissions',
  })
  @ApiNotFoundResponse({
    description: 'Room or user not found',
  })
  async removeMember(
    @Param('id') id: string,
    @Param('userId') userId: string,
    @CurrentUser() user: UserDocument,
  ): Promise<{ message: string }> {
    return this.roomsService.removeMember(id, userId, user);
  }

  @Patch(':id/members/:userId/role')
  @UseGuards(RoomMemberGuard, RoomRoleGuard)
  @RoomRoles('owner')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Update member role',
    description:
      'Update a member role in the room. Only room owners can change member roles.',
  })
  @ApiParam({
    name: 'id',
    description: 'Room ID',
    example: '507f1f77bcf86cd799439011',
  })
  @ApiParam({
    name: 'userId',
    description: 'User ID to update role',
    example: '507f1f77bcf86cd799439011',
  })
  @ApiOkResponse({
    description: 'Member role updated successfully',
    type: MembershipResponseDto,
  })
  @ApiUnauthorizedResponse({
    description: 'Invalid or missing access token',
  })
  @ApiForbiddenResponse({
    description:
      'You are not a member of this room or insufficient permissions',
  })
  @ApiNotFoundResponse({
    description: 'Room or user not found',
  })
  async updateMemberRole(
    @Param('id') id: string,
    @Param('userId') userId: string,
    @Body() updateMemberRoleDto: UpdateMemberRoleDto,
    @CurrentUser() user: UserDocument,
  ): Promise<MembershipResponseDto> {
    return this.roomsService.updateMemberRole(
      id,
      userId,
      updateMemberRoleDto,
      user,
    );
  }

  @Get(':id/members')
  @UseGuards(RoomMemberGuard)
  @ApiOperation({
    summary: 'Get room members',
    description:
      'Retrieve all members of the room. User must be a member of the room.',
  })
  @ApiParam({
    name: 'id',
    description: 'Room ID',
    example: '507f1f77bcf86cd799439011',
  })
  @ApiOkResponse({
    description: 'Room members retrieved successfully',
    type: [MembershipResponseDto],
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
  async getRoomMembers(
    @Param('id') id: string,
    @CurrentUser() user: UserDocument,
  ): Promise<MembershipResponseDto[]> {
    return this.roomsService.getRoomMembers(id, (user._id as any).toString());
  }
}
