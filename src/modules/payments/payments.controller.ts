import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  ParseIntPipe,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { PaymentsService } from './payments.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@ApiTags('Payments')
@Controller('sales')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post(':id/payments')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Add a payment to a sale (credit repayment)' })
  addPayment(
    @Param('id', ParseIntPipe) saleId: number,
    @Body() dto: CreatePaymentDto,
  ) {
    return this.paymentsService.addPayment(saleId, dto);
  }

  @Get(':id/payments')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List payments for a sale' })
  listPayments(@Param('id', ParseIntPipe) saleId: number) {
    return this.paymentsService.listPayments(saleId);
  }
}