import { Module } from '@nestjs/common';
import { PaymentGatewayController } from './payment-gateway.controller';
import { PaymentGatewayService } from './payment-gateway.service';
import { PrismaService } from '../../prisma/prisma.service';
import { EmailModule } from '../email/email.module';

@Module({
  imports: [EmailModule],
  controllers: [PaymentGatewayController],
  providers: [PaymentGatewayService, PrismaService],
  exports: [PaymentGatewayService],
})
export class PaymentGatewayModule {}