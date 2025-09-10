import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { RedisService } from '../../common/redis/redis.service';
import { User, UserDocument } from '../users/schemas/user.schema';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshDto } from './dto/refresh.dto';
import { AuthResponseDto } from './dto/auth-response.dto';

@Injectable()
export class AuthService {
  private readonly saltRounds = 12;

  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    private jwtService: JwtService,
    private configService: ConfigService,
    private redisService: RedisService,
  ) {}

  async register(registerDto: RegisterDto): Promise<AuthResponseDto> {
    const { email, password, name } = registerDto;

    // Check if user already exists
    const existingUser = await this.userModel.findOne({ email });
    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, this.saltRounds);

    // Create user
    const user = new this.userModel({
      email,
      passwordHash: hashedPassword,
      name,
      role: 'user',
      isActive: true,
    });

    await user.save();

    // Generate tokens
    const tokens = await this.generateTokens(user);

    return {
      ...tokens,
      user: {
        id: (user._id as any).toString(),
        email: user.email,
        name: user.name,
        role: user.role,
      },
    };
  }

  async login(loginDto: LoginDto): Promise<AuthResponseDto> {
    const { email, password } = loginDto;

    const user = await this.userModel
      .findOne({ email, isActive: true })
      .select('+passwordHash +password')
      .exec();
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Verify password
    const storedPassword = user.passwordHash || (user as any).password;
    if (!storedPassword) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await bcrypt.compare(password, storedPassword);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Update last login
    user.lastLoginAt = new Date();
    await user.save();

    // Generate tokens
    const tokens = await this.generateTokens(user);

    return {
      ...tokens,
      user: {
        id: (user._id as any).toString(),
        email: user.email,
        name: user.name,
        role: user.role,
      },
    };
  }

  async refresh(refreshDto: RefreshDto): Promise<AuthResponseDto> {
    const { refreshToken } = refreshDto;

    try {
      // Verify refresh token
      const payload = this.jwtService.verify(refreshToken, {
        secret: this.configService.get('jwt.refreshSecret'),
      });

      // Check if refresh token is blacklisted
      const isBlacklisted = await this.redisService.exists(
        `blacklist:${refreshToken}`,
      );
      if (isBlacklisted) {
        throw new UnauthorizedException('Refresh token has been invalidated');
      }

      // Find user
      const user = await this.userModel.findById(payload.sub);
      if (!user || !user.isActive) {
        throw new UnauthorizedException('User not found or inactive');
      }

      // Generate new tokens
      const tokens = await this.generateTokens(user);

      // Blacklist old refresh token
      await this.blacklistRefreshToken(refreshToken);

      return {
        ...tokens,
        user: {
          id: (user._id as any).toString(),
          email: user.email,
          name: user.name,
          role: user.role,
        },
      };
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  async logout(refreshToken: string): Promise<void> {
    if (refreshToken) {
      await this.blacklistRefreshToken(refreshToken);
    }
  }

  async validateUser(userId: string): Promise<User | null> {
    const user = await this.userModel.findById(userId);
    return user && user.isActive ? user : null;
  }

  private async generateTokens(user: UserDocument): Promise<{
    accessToken: string;
    refreshToken: string;
  }> {
    const payload = {
      sub: (user._id as any).toString(),
      email: user.email,
      _id: (user._id as any).toString(),
      role: user.role,
    };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: this.configService.get('jwt.accessSecret'),
        expiresIn: this.configService.get('jwt.accessTtl'),
      }),
      this.jwtService.signAsync(payload, {
        secret: this.configService.get('jwt.refreshSecret'),
        expiresIn: this.configService.get('jwt.refreshTtl'),
      }),
    ]);

    return { accessToken, refreshToken };
  }

  private async blacklistRefreshToken(refreshToken: string): Promise<void> {
    try {
      // Decode token to get expiration time
      const decoded = this.jwtService.decode(refreshToken) as any;
      const expirationTime = decoded.exp * 1000; // Convert to milliseconds
      const currentTime = Date.now();
      const ttl = Math.floor((expirationTime - currentTime) / 1000);

      if (ttl > 0) {
        await this.redisService.set(`blacklist:${refreshToken}`, '1', ttl);
      }
    } catch (error) {
      // If we can't decode the token, we can't blacklist it
      console.error('Error blacklisting refresh token:', error);
    }
  }

  /**
   * Migrate user from old password field to passwordHash field
   * This is a one-time migration helper
   */
  async migrateUserPassword(userId: string): Promise<void> {
    const user = await this.userModel
      .findById(userId)
      .select('+password +passwordHash')
      .exec();

    if (user && (user as any).password && !user.passwordHash) {
      // Migrate password to passwordHash
      await this.userModel
        .findByIdAndUpdate(userId, {
          passwordHash: (user as any).password,
          $unset: { password: 1 },
        })
        .exec();
      console.log(`Migrated password for user: ${user.email}`);
    }
  }
}
