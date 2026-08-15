import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Query,
  ParseIntPipe,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
} from '@nestjs/swagger';
import { SalesService } from './sales.service';
import { CreateSaleDto } from './dto/create-sale.dto';
import { RefundSaleDto } from './dto/refund-sale.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { GetUser } from '../../common/decorators/get-user.decorator';
import { PaymentMethod } from '@prisma/client';

@ApiTags('Sales')
@Controller('sales')
export class SalesController {
  constructor(private readonly salesService: SalesService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a complete sale (cashier/admin)' })
  create(@GetUser('userId') userId: number, @Body() dto: CreateSaleDto) {
    return this.salesService.create(userId, dto);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List sales with multi-parameter filtering' })
  @ApiQuery({ name: 'branchId', required: false, type: Number })
  @ApiQuery({ name: 'dateFrom', required: false, type: String })
  @ApiQuery({ name: 'dateTo', required: false, type: String })
  @ApiQuery({ name: 'cashierId', required: false, type: Number })
  @ApiQuery({ name: 'posId', required: false, type: String })
  @ApiQuery({ name: 'paymentMethod', required: false, enum: PaymentMethod })
  @ApiQuery({ name: 'status', required: false, type: String })
  findAll(
    @Query('branchId') branchId?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
    @Query('cashierId') cashierId?: string,
    @Query('posId') posId?: string,
    @Query('paymentMethod') paymentMethod?: PaymentMethod,
    @Query('status') status?: string,
  ) {
    return this.salesService.findAll({
      branchId: branchId ? parseInt(branchId, 10) : undefined,
      dateFrom,
      dateTo,
      cashierId: cashierId ? parseInt(cashierId, 10) : undefined,
      posId,
      paymentMethod,
      status,
    });
  }

  @Get('search')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Search sales by transaction number, customer name, or notes' })
  @ApiQuery({ name: 'q', required: true, type: String })
  search(@Query('q') q: string) {
    return this.salesService.search(q);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get a single sale with details' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.salesService.findOne(id);
  }

  @Post(':id/refund')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN', 'IT_ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Full refund a sale (admin only)' })
  refund(
    @Param('id', ParseIntPipe) id: number,
    @GetUser('userId') userId: number,
    @Body() dto: RefundSaleDto,
  ) {
    return this.salesService.refund(id, userId, dto);
  }

  @Get(':id/invoice')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get sale invoice data (for printing/receipt)' })
  invoice(@Param('id', ParseIntPipe) id: number) {
    return this.salesService.findOne(id);
  }
}