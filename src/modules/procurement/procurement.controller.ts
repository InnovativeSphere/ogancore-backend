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
import { Roles } from '../../common/decorators/roles.decorator';
import { GetUser } from '../../common/decorators/get-user.decorator';
import { RequisitionStatus, OrderStatus } from '@prisma/client';
import { SubscriptionGuard } from '../../common/guards/subscription.guard';


@ApiTags('Procurement')
@Controller('procurement')
@UseGuards(JwtAuthGuard, RolesGuard, SubscriptionGuard)
@Roles('ADMIN', 'SUPER_ADMIN', 'IT_ADMIN', 'MANAGEMENT')
@ApiBearerAuth()
export class ProcurementController {
  constructor(private readonly procurementService: ProcurementService) {}

  // Requisitions
  @Post('requisitions')
  @ApiOperation({ summary: 'Create a purchase requisition' })
  createRequisition(@GetUser('userId') userId: number, @Body() dto: CreateRequisitionDto) {
    return this.procurementService.createRequisition(userId, dto);
  }

  @Get('requisitions')
  @ApiOperation({ summary: 'List requisitions' })
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
  @ApiOperation({ summary: 'Get a requisition' })
  getRequisition(@Param('id', ParseIntPipe) id: number) {
    return this.procurementService.getRequisition(id);
  }

  @Patch('requisitions/:id')
  @ApiOperation({ summary: 'Update a requisition (e.g., approve)' })
  updateRequisition(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateRequisitionDto,
  ) {
    return this.procurementService.updateRequisition(id, dto);
  }

  @Delete('requisitions/:id')
  @ApiOperation({ summary: 'Cancel/reject a requisition' })
  deleteRequisition(@Param('id', ParseIntPipe) id: number) {
    return this.procurementService.deleteRequisition(id);
  }

  // Purchase Orders
  @Post('orders')
  @ApiOperation({ summary: 'Create a purchase order' })
  createPurchaseOrder(@GetUser('userId') userId: number, @Body() dto: CreatePurchaseOrderDto) {
    return this.procurementService.createPurchaseOrder(userId, dto);
  }

  @Get('orders')
  @ApiOperation({ summary: 'List purchase orders' })
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
  @ApiOperation({ summary: 'Get a purchase order' })
  getPurchaseOrder(@Param('id', ParseIntPipe) id: number) {
    return this.procurementService.getPurchaseOrder(id);
  }

  @Patch('orders/:id')
  @ApiOperation({ summary: 'Update a purchase order' })
  updatePurchaseOrder(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdatePurchaseOrderDto,
  ) {
    return this.procurementService.updatePurchaseOrder(id, dto);
  }

  // Goods Receipts
  @Post('receipts')
  @ApiOperation({ summary: 'Record a goods receipt (auto-updates inventory)' })
  createGoodsReceipt(@GetUser('userId') userId: number, @Body() dto: CreateGoodsReceiptDto) {
    return this.procurementService.createGoodsReceipt(userId, dto);
  }

  @Get('receipts')
  @ApiOperation({ summary: 'List goods receipts' })
  listGoodsReceipts() {
    return this.procurementService.listGoodsReceipts();
  }

  @Get('receipts/:id')
  @ApiOperation({ summary: 'Get a goods receipt' })
  getGoodsReceipt(@Param('id', ParseIntPipe) id: number) {
    return this.procurementService.getGoodsReceipt(id);
  }
}