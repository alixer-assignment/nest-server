import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { INestApplication } from '@nestjs/common';

/**
 * Swagger Configuration for Alixer Chat Backend API
 *
 * This file contains comprehensive API documentation configuration
 * for the Alixer Chat application backend services.
 */

export const SWAGGER_CONFIG = {
  title: 'Alixer Chat API',
  description: `
    # Alixer Chat Backend API Documentation
  `,
  version: '1.0.0',
  license: {
    name: 'MIT',
    url: 'https://opensource.org/licenses/MIT',
  },
  servers: [
    {
      url: 'http://localhost:4000',
      description: 'Development Server',
    },
  ],
  tags: [
    {
      name: 'Health',
      description: 'Application health and status endpoints',
    },
    {
      name: 'Authentication',
      description: 'User authentication and authorization endpoints',
    },
    {
      name: 'Users',
      description: 'User management and profile operations',
    },
    {
      name: 'Rooms',
      description: 'Chat room management and operations',
    },
    {
      name: 'Messages',
      description: 'Message handling and chat operations',
    },
    {
      name: 'WebSocket',
      description: 'Real-time communication endpoints',
    },
  ],
  securitySchemes: {
    bearerAuth: {
      type: 'http',
      scheme: 'bearer',
      bearerFormat: 'JWT',
      description: 'Enter JWT access token',
    },
    refreshToken: {
      type: 'apiKey',
      in: 'header',
      name: 'x-refresh-token',
      description: 'Enter refresh token for token renewal',
    },
  },
  security: [
    {
      bearerAuth: [],
    },
  ],
};

/**
 * API Response Schemas Documentation
 */
export const API_RESPONSES = {
  // Success Responses
  SUCCESS: {
    description: 'Operation completed successfully',
    status: 200,
  },
  CREATED: {
    description: 'Resource created successfully',
    status: 201,
  },
  NO_CONTENT: {
    description: 'Operation completed successfully with no content',
    status: 204,
  },

  // Error Responses
  BAD_REQUEST: {
    description: 'Bad Request - Invalid input data',
    status: 400,
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 400 },
        message: { type: 'string', example: 'Validation failed' },
        error: { type: 'string', example: 'Bad Request' },
        timestamp: { type: 'string', example: '2024-01-01T00:00:00.000Z' },
        path: { type: 'string', example: '/api/auth/register' },
        method: { type: 'string', example: 'POST' },
      },
    },
  },
  UNAUTHORIZED: {
    description: 'Unauthorized - Invalid or missing authentication',
    status: 401,
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 401 },
        message: { type: 'string', example: 'Unauthorized' },
        error: { type: 'string', example: 'Unauthorized' },
        timestamp: { type: 'string', example: '2024-01-01T00:00:00.000Z' },
        path: { type: 'string', example: '/auth/profile' },
        method: { type: 'string', example: 'GET' },
      },
    },
  },
  FORBIDDEN: {
    description: 'Forbidden - Insufficient permissions',
    status: 403,
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 403 },
        message: { type: 'string', example: 'Forbidden' },
        error: { type: 'string', example: 'Forbidden' },
        timestamp: { type: 'string', example: '2024-01-01T00:00:00.000Z' },
        path: { type: 'string', example: '/admin/users' },
        method: { type: 'string', example: 'GET' },
      },
    },
  },
  NOT_FOUND: {
    description: 'Not Found - Resource does not exist',
    status: 404,
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 404 },
        message: { type: 'string', example: 'Resource not found' },
        error: { type: 'string', example: 'Not Found' },
        timestamp: { type: 'string', example: '2024-01-01T00:00:00.000Z' },
        path: { type: 'string', example: '/users/123' },
        method: { type: 'string', example: 'GET' },
      },
    },
  },
  CONFLICT: {
    description: 'Conflict - Resource already exists',
    status: 409,
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 409 },
        message: { type: 'string', example: 'User already exists' },
        error: { type: 'string', example: 'Conflict' },
        timestamp: { type: 'string', example: '2024-01-01T00:00:00.000Z' },
        path: { type: 'string', example: '/auth/register' },
        method: { type: 'string', example: 'POST' },
      },
    },
  },
  INTERNAL_SERVER_ERROR: {
    description: 'Internal Server Error - Unexpected server error',
    status: 500,
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 500 },
        message: { type: 'string', example: 'Internal server error' },
        error: { type: 'string', example: 'Internal Server Error' },
        timestamp: { type: 'string', example: '2024-01-01T00:00:00.000Z' },
        path: { type: 'string', example: '/auth/login' },
        method: { type: 'string', example: 'POST' },
      },
    },
  },
};

/**
 * Common API Examples
 */
export const API_EXAMPLES = {
  // User Examples
  USER: {
    id: '507f1f77bcf86cd799439011',
    email: 'john.doe@example.com',
    name: 'John Doe',
    role: 'user',
    isActive: true,
    lastLoginAt: '2024-01-01T12:00:00.000Z',
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T12:00:00.000Z',
  },

  // Auth Examples
  AUTH_RESPONSE: {
    accessToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
    refreshToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
    user: {
      id: '507f1f77bcf86cd799439011',
      email: 'john.doe@example.com',
      name: 'John Doe',
      role: 'user',
    },
  },

  // Room Examples
  ROOM: {
    id: '507f1f77bcf86cd799439012',
    name: 'General Chat',
    description: 'General discussion room',
    type: 'public',
    members: ['507f1f77bcf86cd799439011'],
    createdBy: '507f1f77bcf86cd799439011',
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T12:00:00.000Z',
  },

  // Message Examples
  MESSAGE: {
    id: '507f1f77bcf86cd799439013',
    roomId: '507f1f77bcf86cd799439012',
    userId: '507f1f77bcf86cd799439011',
    content: 'Hello everyone!',
    type: 'text',
    timestamp: '2024-01-01T12:00:00.000Z',
    edited: false,
    deleted: false,
  },

  // Error Examples
  VALIDATION_ERROR: {
    statusCode: 400,
    message: [
      'email must be a valid email address',
      'password must be at least 8 characters long',
      'name must be at least 2 characters long',
    ],
    error: 'Bad Request',
    timestamp: '2024-01-01T00:00:00.000Z',
    path: '/auth/register',
    method: 'POST',
  },
};

/**
 * Setup Swagger documentation for the application
 */
export function setupSwagger(app: INestApplication): void {
  const config = new DocumentBuilder()
    .setTitle(SWAGGER_CONFIG.title)
    .setDescription(SWAGGER_CONFIG.description)
    .setVersion(SWAGGER_CONFIG.version)

    .setLicense(SWAGGER_CONFIG.license.name, SWAGGER_CONFIG.license.url)
    .addServer(
      SWAGGER_CONFIG.servers[0].url,
      SWAGGER_CONFIG.servers[0].description,
    )

    .addTag('Health', SWAGGER_CONFIG.tags[0].description)
    .addTag('Authentication', SWAGGER_CONFIG.tags[1].description)
    .addTag('Users', SWAGGER_CONFIG.tags[2].description)
    .addTag('Rooms', SWAGGER_CONFIG.tags[3].description)
    .addTag('Messages', SWAGGER_CONFIG.tags[4].description)
    .addTag('WebSocket', SWAGGER_CONFIG.tags[5].description)
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'JWT',
        description: 'Enter JWT access token',
        in: 'header',
      },
      'bearerAuth',
    )
    .addApiKey(
      {
        type: 'apiKey',
        name: 'x-refresh-token',
        in: 'header',
        description: 'Enter refresh token for token renewal',
      },
      'refreshToken',
    )
    .build();

  const document = SwaggerModule.createDocument(app, config, {
    operationIdFactory: (controllerKey: string, methodKey: string) => methodKey,
  });

  SwaggerModule.setup('api/docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
      displayRequestDuration: true,
      filter: true,
      showExtensions: true,
      showCommonExtensions: true,
      docExpansion: 'none',
      defaultModelsExpandDepth: 2,
      defaultModelExpandDepth: 2,
    },
    customSiteTitle: 'Alixer Chat API Documentation',
    customfavIcon: '/favicon.ico',
    customCss: `
      .swagger-ui .topbar { display: none; }
      .swagger-ui .info .title { color: #3b82f6; }
      .swagger-ui .scheme-container { background: #f8fafc; padding: 20px; border-radius: 8px; }
    `,
  });

  console.log(
    `📚 Swagger documentation available at: http://localhost:4000/api/docs`,
  );
}
