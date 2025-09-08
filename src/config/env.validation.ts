import { plainToClass, Transform } from 'class-transformer';
import {
  IsString,
  IsNumber,
  IsOptional,
  validateSync,
  IsUrl,
} from 'class-validator';

export class EnvironmentVariables {
  @IsNumber()
  @Transform(({ value }) => parseInt(value, 10))
  @IsOptional()
  PORT?: number = 4000;

  @IsString()
  MONGO_URI: string;

  @IsString()
  REDIS_URL: string;

  @IsString()
  KAFKA_BROKER: string;

  @IsString()
  JWT_ACCESS_SECRET: string;

  @IsString()
  JWT_REFRESH_SECRET: string;

  @IsString()
  @IsOptional()
  JWT_ACCESS_TTL?: string = '900s';

  @IsString()
  @IsOptional()
  JWT_REFRESH_TTL?: string = '7d';

  @IsUrl()
  FASTAPI_URL: string;

  @IsString()
  SERVICE_SHARED_SECRET: string;

  @IsString()
  @IsOptional()
  CORS_ORIGINS?: string;
}

export function validate(config: Record<string, unknown>) {
  const validatedConfig = plainToClass(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  });
  const errors = validateSync(validatedConfig, {
    skipMissingProperties: false,
  });

  if (errors.length > 0) {
    throw new Error(errors.toString());
  }
  return validatedConfig;
}
