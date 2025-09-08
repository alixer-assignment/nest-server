import {
  Controller,
  Get,
  Patch,
  Param,
  Body,
  Query,
  UseGuards,
  Request,
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
} from '@nestjs/swagger';
import { UsersService } from './users.service';
import { UpdateUserDto } from './dto/update-user.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { UserResponseDto } from './dto/user-response.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User, UserDocument } from './schemas/user.schema';

@ApiTags('Users')
@Controller('users')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('bearerAuth')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  @ApiOperation({
    summary: 'Get current user profile',
    description: 'Retrieve the current authenticated user profile information.',
  })
  @ApiOkResponse({
    description: 'User profile retrieved successfully',
    type: UserResponseDto,
  })
  @ApiUnauthorizedResponse({
    description: 'Invalid or missing access token',
  })
  async getCurrentUser(
    @CurrentUser() user: UserDocument,
  ): Promise<UserResponseDto> {
    const userProfile = await this.usersService.findById(
      (user._id as any).toString(),
    );
    if (!userProfile) {
      throw new Error('User not found');
    }
    return userProfile;
  }

  @Patch('me')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Update current user profile',
    description:
      'Update the current authenticated user profile (name and avatar).',
  })
  @ApiOkResponse({
    description: 'User profile updated successfully',
    type: UserResponseDto,
  })
  @ApiUnauthorizedResponse({
    description: 'Invalid or missing access token',
  })
  async updateCurrentUser(
    @CurrentUser() user: UserDocument,
    @Body() updateUserDto: UpdateUserDto,
  ): Promise<UserResponseDto> {
    return this.usersService.updateProfile(
      (user._id as any).toString(),
      updateUserDto,
      user,
    );
  }

  // Admin-only endpoints
  @Get()
  @UseGuards(RolesGuard)
  @Roles('admin')
  @ApiOperation({
    summary: 'Get all users (Admin only)',
    description:
      'Retrieve a paginated list of all users. Only accessible by administrators.',
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
    description: 'Number of users per page (default: 10)',
    example: 10,
  })
  @ApiOkResponse({
    description: 'Users retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        users: {
          type: 'array',
          items: { $ref: '#/components/schemas/UserResponseDto' },
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
  @ApiForbiddenResponse({
    description: 'Insufficient permissions - Admin role required',
  })
  async getAllUsers(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
  ) {
    return this.usersService.findAll(page, limit);
  }

  @Get(':id')
  @UseGuards(RolesGuard)
  @Roles('admin')
  @ApiOperation({
    summary: 'Get user by ID (Admin only)',
    description:
      'Retrieve a specific user by their ID. Only accessible by administrators.',
  })
  @ApiParam({
    name: 'id',
    description: 'User ID',
    example: '507f1f77bcf86cd799439011',
  })
  @ApiOkResponse({
    description: 'User retrieved successfully',
    type: UserResponseDto,
  })
  @ApiUnauthorizedResponse({
    description: 'Invalid or missing access token',
  })
  @ApiForbiddenResponse({
    description: 'Insufficient permissions - Admin role required',
  })
  @ApiNotFoundResponse({
    description: 'User not found',
  })
  async getUserById(@Param('id') id: string): Promise<UserResponseDto> {
    const user = await this.usersService.findById(id);
    if (!user) {
      throw new Error('User not found');
    }
    return user;
  }

  @Patch(':id/role')
  @UseGuards(RolesGuard)
  @Roles('admin')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Update user role (Admin only)',
    description:
      'Update a user role. Only accessible by administrators. Admins cannot change their own role.',
  })
  @ApiParam({
    name: 'id',
    description: 'User ID',
    example: '507f1f77bcf86cd799439011',
  })
  @ApiOkResponse({
    description: 'User role updated successfully',
    type: UserResponseDto,
  })
  @ApiUnauthorizedResponse({
    description: 'Invalid or missing access token',
  })
  @ApiForbiddenResponse({
    description:
      'Insufficient permissions - Admin role required or cannot change own role',
  })
  @ApiNotFoundResponse({
    description: 'User not found',
  })
  async updateUserRole(
    @Param('id') id: string,
    @Body() updateRoleDto: UpdateRoleDto,
    @CurrentUser() currentUser: UserDocument,
  ): Promise<UserResponseDto> {
    return this.usersService.updateRole(id, updateRoleDto, currentUser);
  }

  @Patch(':id/deactivate')
  @UseGuards(RolesGuard)
  @Roles('admin')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Deactivate user (Admin only)',
    description:
      'Deactivate a user account. Only accessible by administrators. Admins cannot deactivate themselves.',
  })
  @ApiParam({
    name: 'id',
    description: 'User ID',
    example: '507f1f77bcf86cd799439011',
  })
  @ApiOkResponse({
    description: 'User deactivated successfully',
    type: UserResponseDto,
  })
  @ApiUnauthorizedResponse({
    description: 'Invalid or missing access token',
  })
  @ApiForbiddenResponse({
    description:
      'Insufficient permissions - Admin role required or cannot deactivate own account',
  })
  @ApiNotFoundResponse({
    description: 'User not found',
  })
  async deactivateUser(
    @Param('id') id: string,
    @CurrentUser() currentUser: UserDocument,
  ): Promise<UserResponseDto> {
    return this.usersService.deactivateUser(id, currentUser);
  }

  @Patch(':id/activate')
  @UseGuards(RolesGuard)
  @Roles('admin')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Activate user (Admin only)',
    description: 'Activate a user account. Only accessible by administrators.',
  })
  @ApiParam({
    name: 'id',
    description: 'User ID',
    example: '507f1f77bcf86cd799439011',
  })
  @ApiOkResponse({
    description: 'User activated successfully',
    type: UserResponseDto,
  })
  @ApiUnauthorizedResponse({
    description: 'Invalid or missing access token',
  })
  @ApiForbiddenResponse({
    description: 'Insufficient permissions - Admin role required',
  })
  @ApiNotFoundResponse({
    description: 'User not found',
  })
  async activateUser(
    @Param('id') id: string,
    @CurrentUser() currentUser: UserDocument,
  ): Promise<UserResponseDto> {
    return this.usersService.activateUser(id, currentUser);
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles('admin')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Update user profile (Admin only)',
    description: 'Update any user profile. Only accessible by administrators.',
  })
  @ApiParam({
    name: 'id',
    description: 'User ID',
    example: '507f1f77bcf86cd799439011',
  })
  @ApiOkResponse({
    description: 'User profile updated successfully',
    type: UserResponseDto,
  })
  @ApiUnauthorizedResponse({
    description: 'Invalid or missing access token',
  })
  @ApiForbiddenResponse({
    description: 'Insufficient permissions - Admin role required',
  })
  @ApiNotFoundResponse({
    description: 'User not found',
  })
  async updateUser(
    @Param('id') id: string,
    @Body() updateUserDto: UpdateUserDto,
    @CurrentUser() currentUser: UserDocument,
  ): Promise<UserResponseDto> {
    return this.usersService.updateProfile(id, updateUserDto, currentUser);
  }
}
