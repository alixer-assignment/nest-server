import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  UseGuards,
  Request,
  Get,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiBearerAuth,
  ApiUnauthorizedResponse,
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiOkResponse,
} from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshDto } from './dto/refresh.dto';
import { AuthResponseDto } from './dto/auth-response.dto';
import { LogoutResponseDto } from './dto/logout-response.dto';
import { ProfileResponseDto } from './dto/profile-response.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RefreshTokenGuard } from './guards/refresh-token.guard';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Register a new user',
    description:
      'Create a new user account with email, password, and name. Returns JWT tokens upon successful registration.',
  })
  @ApiBody({
    type: RegisterDto,
    description: 'User registration data',
    examples: {
      example1: {
        summary: 'Standard registration',
        value: {
          email: 'john.doe@example.com',
          password: 'SecurePassword123!',
          name: 'John Doe',
        },
      },
    },
  })
  @ApiCreatedResponse({
    description: 'User registered successfully',
    type: AuthResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Invalid input data or validation failed',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 400 },
        message: {
          type: 'array',
          items: { type: 'string' },
          example: [
            'email must be a valid email address',
            'password must be at least 8 characters long',
          ],
        },
        error: { type: 'string', example: 'Bad Request' },
      },
    },
  })
  @ApiConflictResponse({
    description: 'User with this email already exists',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 409 },
        message: {
          type: 'string',
          example: 'User with this email already exists',
        },
        error: { type: 'string', example: 'Conflict' },
      },
    },
  })
  async register(@Body() registerDto: RegisterDto): Promise<AuthResponseDto> {
    return this.authService.register(registerDto);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'User login',
    description:
      'Authenticate user with email and password. Returns JWT tokens upon successful authentication.',
  })
  @ApiBody({
    type: LoginDto,
    description: 'User login credentials',
    examples: {
      example1: {
        summary: 'Standard login',
        value: {
          email: 'john.doe@example.com',
          password: 'SecurePassword123!',
        },
      },
    },
  })
  @ApiOkResponse({
    description: 'User logged in successfully',
    type: AuthResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Invalid input data or validation failed',
  })
  @ApiUnauthorizedResponse({
    description: 'Invalid email or password',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 401 },
        message: { type: 'string', example: 'Invalid email or password' },
        error: { type: 'string', example: 'Unauthorized' },
      },
    },
  })
  async login(@Body() loginDto: LoginDto): Promise<AuthResponseDto> {
    return this.authService.login(loginDto);
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @UseGuards(RefreshTokenGuard)
  @ApiOperation({
    summary: 'Refresh access token',
    description:
      'Generate new access token using a valid refresh token. The refresh token must be provided in the request body.',
  })
  @ApiBody({
    type: RefreshDto,
    description: 'Refresh token data',
    examples: {
      example1: {
        summary: 'Token refresh',
        value: {
          refreshToken:
            'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI1MDdmMWY3N2JjZjg2Y2Q3OTk0MzkwMTEiLCJlbWFpbCI6ImpvaG4uZG9lQGV4YW1wbGUuY29tIiwicm9sZSI6InVzZXIiLCJpYXQiOjE3MDQwNjcyMDAsImV4cCI6MTcwNDY3MjAwMH0.example',
        },
      },
    },
  })
  @ApiOkResponse({
    description: 'Tokens refreshed successfully',
    type: AuthResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Invalid refresh token format',
  })
  @ApiUnauthorizedResponse({
    description: 'Invalid or expired refresh token',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 401 },
        message: {
          type: 'string',
          example: 'Invalid or expired refresh token',
        },
        error: { type: 'string', example: 'Unauthorized' },
      },
    },
  })
  async refresh(@Body() refreshDto: RefreshDto): Promise<AuthResponseDto> {
    return this.authService.refresh(refreshDto);
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('bearerAuth')
  @ApiOperation({
    summary: 'User logout',
    description:
      'Logout user and invalidate refresh token. Requires valid JWT access token in Authorization header.',
  })
  @ApiOkResponse({
    description: 'User logged out successfully',
    type: LogoutResponseDto,
  })
  @ApiUnauthorizedResponse({
    description: 'Invalid or missing access token',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 401 },
        message: { type: 'string', example: 'No token provided' },
        error: { type: 'string', example: 'Unauthorized' },
      },
    },
  })
  async logout(@Request() req: any): Promise<LogoutResponseDto> {
    const refreshToken = req.body.refreshToken;
    await this.authService.logout(refreshToken);
    return { message: 'Logged out successfully' };
  }

  @Get('profile')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('bearerAuth')
  @ApiOperation({
    summary: 'Get user profile',
    description:
      'Retrieve current user profile information. Requires valid JWT access token in Authorization header.',
  })
  @ApiOkResponse({
    description: 'User profile retrieved successfully',
    type: ProfileResponseDto,
  })
  @ApiUnauthorizedResponse({
    description: 'Invalid or missing access token',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 401 },
        message: { type: 'string', example: 'No token provided' },
        error: { type: 'string', example: 'Unauthorized' },
      },
    },
  })
  async getProfile(@Request() req: any): Promise<ProfileResponseDto> {
    return {
      id: req.user.id,
      email: req.user.email,
      name: req.user.name,
      role: req.user.role,
    };
  }
}
