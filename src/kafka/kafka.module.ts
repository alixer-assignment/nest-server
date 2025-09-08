import { Module, Global } from '@nestjs/common';
import { ClientsModule } from '@nestjs/microservices';
import { ConfigService } from '@nestjs/config';
import { KafkaService } from './kafka.service';

@Global()
@Module({
  imports: [
    ClientsModule.registerAsync([
      {
        name: 'KAFKA_SERVICE',
        useFactory: (configService: ConfigService) => {
          const kafkaBroker = configService.get<string>('kafka.broker');
          if (!kafkaBroker) {
            throw new Error(
              'KAFKA_BROKER is not defined in environment variables',
            );
          }
          return {
            transport: 4, // Transport.KAFKA
            options: {
              client: {
                clientId: 'backend-service',
                brokers: [kafkaBroker],
              },
              consumer: {
                groupId: 'backend-group',
              },
            },
          } as any;
        },
        inject: [ConfigService],
      },
    ]),
  ],
  providers: [KafkaService],
  exports: [KafkaService, ClientsModule],
})
export class KafkaModule {}
