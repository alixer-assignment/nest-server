import { Injectable, Logger } from '@nestjs/common';
import { CacheService } from '../cache/cache.service';

export interface LogEvent {
  timestamp: string;
  level: 'info' | 'warn' | 'error' | 'debug';
  service: string;
  event: string;
  userId?: string;
  ip?: string;
  userAgent?: string;
  details?: any;
  metadata?: Record<string, any>;
}

@Injectable()
export class LoggingService {
  private readonly logger = new Logger(LoggingService.name);

  constructor(private cacheService: CacheService) {}

  /**
   * Log authentication attempts
   */
  async logAuthAttempt(
    event:
      | 'login'
      | 'logout'
      | 'token_refresh'
      | 'login_failed'
      | 'token_invalid',
    userId?: string,
    ip?: string,
    userAgent?: string,
    details?: any,
  ): Promise<void> {
    const logEvent: LogEvent = {
      timestamp: new Date().toISOString(),
      level:
        event.includes('failed') || event.includes('invalid') ? 'warn' : 'info',
      service: 'auth',
      event,
      userId,
      ip,
      userAgent,
      details,
      metadata: {
        severity:
          event.includes('failed') || event.includes('invalid')
            ? 'high'
            : 'low',
        category: 'authentication',
      },
    };

    await this.logEvent(logEvent);
  }

  /**
   * Log message events
   */
  async logMessageEvent(
    event:
      | 'message_sent'
      | 'message_updated'
      | 'message_deleted'
      | 'message_flagged',
    userId: string,
    roomId: string,
    messageId?: string,
    ip?: string,
    details?: any,
  ): Promise<void> {
    const logEvent: LogEvent = {
      timestamp: new Date().toISOString(),
      level: event === 'message_flagged' ? 'warn' : 'info',
      service: 'messages',
      event,
      userId,
      ip,
      details: {
        roomId,
        messageId,
        ...details,
      },
      metadata: {
        severity: event === 'message_flagged' ? 'medium' : 'low',
        category: 'messaging',
      },
    };

    await this.logEvent(logEvent);
  }

  /**
   * Log moderation events
   */
  async logModerationEvent(
    event:
      | 'message_moderated'
      | 'content_flagged'
      | 'user_warned'
      | 'user_banned',
    userId: string,
    moderatorId?: string,
    roomId?: string,
    messageId?: string,
    details?: any,
  ): Promise<void> {
    const logEvent: LogEvent = {
      timestamp: new Date().toISOString(),
      level: 'warn',
      service: 'moderation',
      event,
      userId,
      details: {
        moderatorId,
        roomId,
        messageId,
        ...details,
      },
      metadata: {
        severity: 'high',
        category: 'moderation',
      },
    };

    await this.logEvent(logEvent);
  }

  /**
   * Log room events
   */
  async logRoomEvent(
    event:
      | 'room_created'
      | 'room_joined'
      | 'room_left'
      | 'room_deleted'
      | 'member_added'
      | 'member_removed',
    userId: string,
    roomId: string,
    targetUserId?: string,
    ip?: string,
    details?: any,
  ): Promise<void> {
    const logEvent: LogEvent = {
      timestamp: new Date().toISOString(),
      level: 'info',
      service: 'rooms',
      event,
      userId,
      ip,
      details: {
        roomId,
        targetUserId,
        ...details,
      },
      metadata: {
        severity: 'low',
        category: 'room_management',
      },
    };

    await this.logEvent(logEvent);
  }

  /**
   * Log security events
   */
  async logSecurityEvent(
    event:
      | 'rate_limit_exceeded'
      | 'suspicious_activity'
      | 'unauthorized_access'
      | 'token_blacklisted',
    userId?: string,
    ip?: string,
    userAgent?: string,
    details?: any,
  ): Promise<void> {
    const logEvent: LogEvent = {
      timestamp: new Date().toISOString(),
      level: 'warn',
      service: 'security',
      event,
      userId,
      ip,
      userAgent,
      details,
      metadata: {
        severity: 'high',
        category: 'security',
      },
    };

    await this.logEvent(logEvent);
  }

  /**
   * Log system events
   */
  async logSystemEvent(
    event:
      | 'service_started'
      | 'service_stopped'
      | 'error_occurred'
      | 'performance_issue',
    service: string,
    details?: any,
  ): Promise<void> {
    const logEvent: LogEvent = {
      timestamp: new Date().toISOString(),
      level:
        event.includes('error') || event.includes('issue') ? 'error' : 'info',
      service,
      event,
      details,
      metadata: {
        severity:
          event.includes('error') || event.includes('issue') ? 'high' : 'low',
        category: 'system',
      },
    };

    await this.logEvent(logEvent);
  }

  /**
   * Store log event in cache and output to console
   */
  private async logEvent(logEvent: LogEvent): Promise<void> {
    try {
      // Store in Redis cache for analysis
      const logKey = `logs:${logEvent.service}:${new Date().toISOString().split('T')[0]}`;
      await this.cacheService.set(
        `${logKey}:${Date.now()}`,
        logEvent,
        86400 * 7,
      ); // 7 days TTL

      // Output to console based on level
      const message = `${logEvent.timestamp} [${logEvent.service}] ${logEvent.event} - ${JSON.stringify(logEvent.details || {})}`;

      switch (logEvent.level) {
        case 'error':
          this.logger.error(message);
          break;
        case 'warn':
          this.logger.warn(message);
          break;
        case 'debug':
          this.logger.debug(message);
          break;
        default:
          this.logger.log(message);
      }
    } catch (error) {
      this.logger.error('Failed to log event:', error);
    }
  }

  /**
   * Get logs for a specific service and date
   */
  async getLogs(service: string, date: string): Promise<LogEvent[]> {
    try {
      const logKey = `logs:${service}:${date}`;
      // In a real implementation, you'd scan Redis keys and retrieve logs
      return [];
    } catch (error) {
      this.logger.error('Failed to retrieve logs:', error);
      return [];
    }
  }

  /**
   * Get security logs
   */
  async getSecurityLogs(limit: number = 100): Promise<LogEvent[]> {
    try {
      // In a real implementation, you'd query security logs specifically
      return [];
    } catch (error) {
      this.logger.error('Failed to retrieve security logs:', error);
      return [];
    }
  }

  /**
   * Get user activity logs
   */
  async getUserActivityLogs(
    userId: string,
    limit: number = 50,
  ): Promise<LogEvent[]> {
    try {
      // In a real implementation, you'd query user-specific logs
      return [];
    } catch (error) {
      this.logger.error('Failed to retrieve user activity logs:', error);
      return [];
    }
  }
}
