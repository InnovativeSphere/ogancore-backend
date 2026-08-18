import { Module } from '@nestjs/common';
import { SalesController } from './sales.controller';
import { SalesService } from './sales.service';
import { NotificationsModule } from '../notifications/notifications.module';


@Module({
  controllers: [SalesController],
  providers: [SalesService],
  exports: [SalesService],
  imports: [NotificationsModule],
})
export class SalesModule {}