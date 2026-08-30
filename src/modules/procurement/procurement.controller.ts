import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  ParseIntPipe,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { ProcurementService } from './procurement.service';
import { CreateRequisitionDto } from './dto/create-requisition.dto';
import { UpdateRequisitionDto } from './dto/update-requisition.dto';
import { CreatePurchaseOrderDto } from './dto/create-purchase-order.dto';
import { UpdatePurchaseOrderDto } from './dto/update-purchase-order.dto';
import { CreateGoodsReceiptDto } from './dto/create-goods-receipt.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { SubscriptionGuard } from '../../common/guards/subscription.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { GetUser } from '../../common/decorators/get-user.decorator';
import { RequisitionStatus, OrderStatus } from '@prisma/client';

@ApiTags('Procurement')
@Controller('procurement')
@UseGuards(JwtAuthGuard, RolesGuard, SubscriptionGuard)
@Roles('ADMIN', 'SUPER_ADMIN', 'IT_ADMIN', 'MANAGEMENT', 'BUSINESS_ADMIN')
@ApiBearerAuth()
export class ProcurementController {
  constructor(private readonly procurementService: ProcurementService) {}

  @Post('requisitions')
  createRequisition(@GetUser('userId') userId: number, @Body() dto: CreateRequisitionDto) {
    return this.procurementService.createRequisition(userId, dto);
  }

  @Get('requisitions')
  @ApiQuery({ name: 'branchId', required: false, type: Number })
  @ApiQuery({ name: 'status', required: false, enum: RequisitionStatus })
  listRequisitions(
    @Query('branchId') branchId?: string,
    @Query('status') status?: RequisitionStatus,
  ) {
    return this.procurementService.listRequisitions(
      branchId ? parseInt(branchId, 10) : undefined,
      status,
    );
  }

  @Get('requisitions/:id')
  getRequisition(@Param('id', ParseIntPipe) id: number) {
    return this.procurementService.getRequisition(id);
  }

  @Patch('requisitions/:id')
  updateRequisition(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateRequisitionDto) {
    return this.procurementService.updateRequisition(id, dto);
  }

  @Delete('requisitions/:id')
  deleteRequisition(@Param('id', ParseIntPipe) id: number) {
    return this.procurementService.deleteRequisition(id);
  }

  @Post('orders')
  createPurchaseOrder(@GetUser('userId') userId: number, @Body() dto: CreatePurchaseOrderDto) {
    return this.procurementService.createPurchaseOrder(userId, dto);
  }

  @Get('orders')
  @ApiQuery({ name: 'branchId', required: false, type: Number })
  @ApiQuery({ name: 'status', required: false, enum: OrderStatus })
  listPurchaseOrders(
    @Query('branchId') branchId?: string,
    @Query('status') status?: OrderStatus,
  ) {
    return this.procurementService.listPurchaseOrders(
      branchId ? parseInt(branchId, 10) : undefined,
      status,
    );
  }

  @Get('orders/:id')
  getPurchaseOrder(@Param('id', ParseIntPipe) id: number) {
    return this.procurementService.getPurchaseOrder(id);
  }

  @Patch('orders/:id')
  updatePurchaseOrder(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdatePurchaseOrderDto) {
    return this.procurementService.updatePurchaseOrder(id, dto);
  }

  @Post('receipts')
  createGoodsReceipt(@GetUser('userId') userId: number, @Body() dto: CreateGoodsReceiptDto) {
    return this.procurementService.createGoodsReceipt(userId, dto);
  }

  @Get('receipts')
  listGoodsReceipts() {
    return this.procurementService.listGoodsReceipts();
  }

  @Get('receipts/:id')
  getGoodsReceipt(@Param('id', ParseIntPipe) id: number) {
    return this.procurementService.getGoodsReceipt(id);
  }
}