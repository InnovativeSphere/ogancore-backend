import {
  Controller,
  Post,
  Body,
  Headers,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { RawBodyRequest } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { PaymentGatewayService } from './payment-gateway.service';
import { InitializePaymentDto } from './dto/initialize-payment.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { GetUser } from '../../common/decorators/get-user.decorator';

@ApiTags('Payments')
@Controller('payments')
export class PaymentGatewayController {
  constructor(private readonly paymentGatewayService: PaymentGatewayService) {}

  @Post('initialize')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Initialize subscription payment' })
  initialize(
    @GetUser('userId') userId: number,
    @Body() dto: InitializePaymentDto,
  ) {
    return this.paymentGatewayService.initializePayment(userId, dto);
  }

  @Post('webhook')
  @ApiOperation({ summary: 'Paystack webhook receiver (no auth)' })
  webhook(
    @Req() req: RawBodyRequest<Request>,
    @Headers() headers: Record<string, string>,
  ) {
    return this.paymentGatewayService.handleWebhook(req, headers);
  }
}