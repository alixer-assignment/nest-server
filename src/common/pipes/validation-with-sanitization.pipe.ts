import {
  PipeTransform,
  Injectable,
  ArgumentMetadata,
  BadRequestException,
} from '@nestjs/common';
import { validate } from 'class-validator';
import { plainToClass } from 'class-transformer';
import { SanitizationService } from '../sanitization/sanitization.service';

@Injectable()
export class ValidationWithSanitizationPipe implements PipeTransform<any> {
  constructor(private sanitizationService: SanitizationService) {}

  async transform(value: any, { metatype }: ArgumentMetadata) {
    if (!metatype || !this.toValidate(metatype)) {
      return value;
    }

    // Sanitize the input first
    const sanitizedValue = this.sanitizeValue(value);

    // Transform to class instance
    const object = plainToClass(metatype, sanitizedValue);

    // Validate
    const errors = await validate(object);

    if (errors.length > 0) {
      const errorMessages = errors
        .map((error) => Object.values(error.constraints || {}).join(', '))
        .join('; ');

      throw new BadRequestException(`Validation failed: ${errorMessages}`);
    }

    return sanitizedValue;
  }

  private toValidate(metatype: Function): boolean {
    const types: Function[] = [String, Boolean, Number, Array, Object];
    return !types.includes(metatype);
  }

  private sanitizeValue(value: any): any {
    if (typeof value === 'string') {
      return this.sanitizationService.sanitizeText(value);
    }

    if (Array.isArray(value)) {
      return value.map((item) => this.sanitizeValue(item));
    }

    if (value && typeof value === 'object') {
      const sanitized: any = {};
      for (const [key, val] of Object.entries(value)) {
        if (key === 'body' && typeof val === 'string') {
          // Special handling for message body - allow some formatting
          sanitized[key] = this.sanitizationService.sanitizeMessageBody(val);
        } else if (key === 'name' && typeof val === 'string') {
          // Special handling for room names
          sanitized[key] = this.sanitizationService.sanitizeRoomName(val);
        } else if (typeof val === 'string') {
          sanitized[key] = this.sanitizationService.sanitizeText(val);
        } else {
          sanitized[key] = this.sanitizeValue(val);
        }
      }
      return sanitized;
    }

    return value;
  }
}
