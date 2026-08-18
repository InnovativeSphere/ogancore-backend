import { Module } from '@nestjs/common';
import { InventoryController } from './inventory.controller';
import { InventoryService } from './inventory.service';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  controllers: [InventoryController],
  providers: [InventoryService],
  exports: [InventoryService],
  imports: [NotificationsModule],
})
export class InventoryModule {}
