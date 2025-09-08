# Backend - NestJS Application

A comprehensive NestJS backend application with MongoDB, Redis, Kafka, and WebSocket support.

## Features

- **NestJS Framework** with TypeScript
- **MongoDB** integration with Mongoose
- **Redis** for caching and session management
- **Kafka** for message streaming (producer & consumer)
- **WebSocket** support for real-time communication
- **JWT Authentication** (ready for implementation)
- **Configuration Management** with dotenv support
- **Security** with Helmet middleware
- **Validation** with class-validator
- **CORS** support

## Project Structure

```
src/
├── auth/                 # Authentication module (empty)
├── config/              # Configuration management
│   ├── app.config.ts
│   ├── database.config.ts
│   ├── jwt.config.ts
│   ├── kafka.config.ts
│   ├── redis.config.ts
│   └── config.module.ts
├── database/            # MongoDB connection
│   └── database.module.ts
├── kafka/              # Kafka client (producer & consumer)
│   ├── kafka.module.ts
│   └── kafka.service.ts
├── messages/           # Messages module (empty)
├── redis/             # Redis connection
│   ├── redis.module.ts
│   └── redis.service.ts
├── rooms/             # Rooms module (empty)
├── users/             # Users module (empty)
├── websocket/         # WebSocket gateway
│   ├── websocket.gateway.ts
│   └── websocket.module.ts
├── app.module.ts      # Main application module
└── main.ts           # Application bootstrap
```

## Prerequisites

- Node.js (v18 or higher)
- pnpm package manager
- MongoDB
- Redis
- Kafka (optional)

## Installation

1. Install dependencies:

```bash
pnpm install
```

2. Create environment file:

```bash
cp .env.example .env
```

3. Update the `.env` file with your configuration values.

## Environment Variables

Create a `.env` file in the root directory with the following variables:

```env
# Application Configuration
PORT=3000
NODE_ENV=development

# Database Configuration
MONGODB_URI=mongodb://localhost:27017/backend
MONGODB_TEST_URI=mongodb://localhost:27017/backend_test

# Redis Configuration
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0

# Kafka Configuration
KAFKA_BROKERS=localhost:9092
KAFKA_CLIENT_ID=backend-service
KAFKA_GROUP_ID=backend-group

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRES_IN=24h

# CORS Configuration
CORS_ORIGIN=http://localhost:3000
```

## Running the Application

### Development

```bash
pnpm start:dev
```

### Production

```bash
pnpm build
pnpm start:prod
```

### Debug Mode

```bash
pnpm start:debug
```

## API Endpoints

The application runs on `http://localhost:3000/api/v1` by default.

## WebSocket

WebSocket server is available at `ws://localhost:3000` with Socket.IO support.

## Testing

```bash
# Unit tests
pnpm test

# E2E tests
pnpm test:e2e

# Test coverage
pnpm test:cov
```

## Linting

```bash
pnpm lint
```

## Available Modules

- **ConfigModule**: Global configuration management
- **DatabaseModule**: MongoDB connection
- **RedisModule**: Redis connection (global)
- **KafkaModule**: Kafka client (global)
- **AuthModule**: Authentication (empty, ready for implementation)
- **UsersModule**: User management (empty, ready for implementation)
- **RoomsModule**: Room management (empty, ready for implementation)
- **MessagesModule**: Message handling (empty, ready for implementation)
- **WebSocketModule**: Real-time communication

## Next Steps

1. Implement authentication logic in `AuthModule`
2. Create user schemas and services in `UsersModule`
3. Set up room management in `RoomsModule`
4. Implement message handling in `MessagesModule`
5. Add proper error handling and logging
6. Set up monitoring and health checks

## License

Nest is [MIT licensed](https://github.com/nestjs/nest/blob/master/LICENSE).
