import { Module } from '@nestjs/common';
import { ExpensesController } from './expenses.controller';
import { ExpensesService } from './expenses.service';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  controllers: [ExpensesController],
  providers: [ExpensesService],
  exports: [ExpensesService],
    imports: [NotificationsModule],

})
export class ExpensesModule {}