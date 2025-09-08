import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from './schemas/user.schema';
import { UpdateUserDto } from './dto/update-user.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { UserResponseDto } from './dto/user-response.dto';

@Injectable()
export class UsersService {
  constructor(@InjectModel(User.name) private userModel: Model<UserDocument>) {}

  /**
   * Get user by ID (without password)
   */
  async findById(id: string): Promise<UserResponseDto | null> {
    const user = await this.userModel
      .findById(id)
      .select('-passwordHash')
      .exec();
    return user ? this.toUserResponse(user) : null;
  }

  /**
   * Get user by email (with password for authentication)
   */
  async findByEmail(email: string): Promise<UserDocument | null> {
    return this.userModel.findOne({ email }).select('+passwordHash').exec();
  }

  /**
   * Get user by email (without password)
   */
  async findByEmailSafe(email: string): Promise<UserResponseDto | null> {
    const user = await this.userModel
      .findOne({ email })
      .select('-passwordHash')
      .exec();
    return user ? this.toUserResponse(user) : null;
  }

  /**
   * Get all users (admin only)
   */
  async findAll(
    page: number = 1,
    limit: number = 10,
  ): Promise<{
    users: UserResponseDto[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const skip = (page - 1) * limit;

    const [users, total] = await Promise.all([
      this.userModel
        .find()
        .select('-passwordHash')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.userModel.countDocuments().exec(),
    ]);

    return {
      users: users.map((user) => this.toUserResponse(user)),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Update user profile (self or admin)
   */
  async updateProfile(
    userId: string,
    updateUserDto: UpdateUserDto,
    currentUser: UserDocument,
  ): Promise<UserResponseDto> {
    // Check if user exists
    const user = await this.userModel.findById(userId).exec();
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Check permissions: user can only update their own profile, admin can update any
    if (
      currentUser.role !== 'admin' &&
      (currentUser._id as any).toString() !== userId
    ) {
      throw new ForbiddenException('You can only update your own profile');
    }

    // Update user
    const updatedUser = await this.userModel
      .findByIdAndUpdate(
        userId,
        { ...updateUserDto, updatedAt: new Date() },
        { new: true, runValidators: true },
      )
      .select('-passwordHash')
      .exec();

    if (!updatedUser) {
      throw new NotFoundException('User not found');
    }

    return this.toUserResponse(updatedUser!);
  }

  /**
   * Update user role (admin only)
   */
  async updateRole(
    userId: string,
    updateRoleDto: UpdateRoleDto,
    currentUser: UserDocument,
  ): Promise<UserResponseDto> {
    // Check if current user is admin
    if (currentUser.role !== 'admin') {
      throw new ForbiddenException('Only admins can modify user roles');
    }

    // Check if user exists
    const user = await this.userModel.findById(userId).exec();
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Prevent admin from changing their own role
    if ((currentUser._id as any).toString() === userId) {
      throw new ForbiddenException('You cannot change your own role');
    }

    // Update role
    const updatedUser = await this.userModel
      .findByIdAndUpdate(
        userId,
        { role: updateRoleDto.role, updatedAt: new Date() },
        { new: true, runValidators: true },
      )
      .select('-passwordHash')
      .exec();

    return this.toUserResponse(updatedUser!);
  }

  /**
   * Deactivate user (admin only)
   */
  async deactivateUser(
    userId: string,
    currentUser: UserDocument,
  ): Promise<UserResponseDto> {
    // Check if current user is admin
    if (currentUser.role !== 'admin') {
      throw new ForbiddenException('Only admins can deactivate users');
    }

    // Check if user exists
    const user = await this.userModel.findById(userId).exec();
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Prevent admin from deactivating themselves
    if ((currentUser._id as any).toString() === userId) {
      throw new ForbiddenException('You cannot deactivate your own account');
    }

    // Deactivate user
    const updatedUser = await this.userModel
      .findByIdAndUpdate(
        userId,
        { isActive: false, updatedAt: new Date() },
        { new: true },
      )
      .select('-passwordHash')
      .exec();

    return this.toUserResponse(updatedUser!);
  }

  /**
   * Activate user (admin only)
   */
  async activateUser(
    userId: string,
    currentUser: UserDocument,
  ): Promise<UserResponseDto> {
    // Check if current user is admin
    if (currentUser.role !== 'admin') {
      throw new ForbiddenException('Only admins can activate users');
    }

    // Check if user exists
    const user = await this.userModel.findById(userId).exec();
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Activate user
    const updatedUser = await this.userModel
      .findByIdAndUpdate(
        userId,
        { isActive: true, updatedAt: new Date() },
        { new: true },
      )
      .select('-passwordHash')
      .exec();

    return this.toUserResponse(updatedUser!);
  }

  /**
   * Delete user (admin only)
   */
  async deleteUser(
    userId: string,
    currentUser: UserDocument,
  ): Promise<{ message: string }> {
    // Check if current user is admin
    if (currentUser.role !== 'admin') {
      throw new ForbiddenException('Only admins can delete users');
    }

    // Check if user exists
    const user = await this.userModel.findById(userId).exec();
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Prevent admin from deleting themselves
    if ((currentUser._id as any).toString() === userId) {
      throw new ForbiddenException('You cannot delete your own account');
    }

    // Delete user
    await this.userModel.findByIdAndDelete(userId).exec();

    return { message: 'User deleted successfully' };
  }

  /**
   * Update last login timestamp
   */
  async updateLastLogin(userId: string): Promise<void> {
    await this.userModel
      .findByIdAndUpdate(userId, { lastLoginAt: new Date() })
      .exec();
  }

  /**
   * Convert UserDocument to UserResponseDto
   */
  private toUserResponse(user: UserDocument): UserResponseDto {
    return {
      _id: (user._id as any).toString(),
      email: user.email,
      name: user.name,
      role: user.role,
      avatarUrl: user.avatarUrl,
      isActive: user.isActive,
      lastLoginAt: user.lastLoginAt,
      createdAt: (user as any).createdAt,
      updatedAt: (user as any).updatedAt,
    };
  }
}
