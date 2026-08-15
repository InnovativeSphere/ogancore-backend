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
import { InventoryService } from './inventory.service';
import { StockInDto } from './dto/stock-in.dto';
import { StockOutDto } from './dto/stock-out.dto';
import { TransferDto } from './dto/transfer.dto';
import { AdjustDto } from './dto/adjust.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { GetUser } from '../../common/decorators/get-user.decorator';

@ApiTags('Inventory')
@Controller('inventory')
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Get(':branchId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'View stock levels for a branch' })
  viewBranchInventory(@Param('branchId', ParseIntPipe) branchId: number) {
    return this.inventoryService.viewBranchInventory(branchId);
  }

  @Post('stock-in')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN', 'IT_ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Receive stock (admin only)' })
  stockIn(@GetUser('userId') userId: number, @Body() dto: StockInDto) {
    return this.inventoryService.stockIn(userId, dto);
  }

  @Post('stock-out')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN', 'IT_ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Remove stock without a sale (admin only)' })
  stockOut(@GetUser('userId') userId: number, @Body() dto: StockOutDto) {
    return this.inventoryService.stockOut(userId, dto);
  }

  @Post('transfer')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN', 'IT_ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Transfer stock between branches (admin only)' })
  transfer(@GetUser('userId') userId: number, @Body() dto: TransferDto) {
    return this.inventoryService.transfer(userId, dto);
  }

  @Post('adjust')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN', 'IT_ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Manually adjust stock (admin only)' })
  adjust(@GetUser('userId') userId: number, @Body() dto: AdjustDto) {
    return this.inventoryService.adjust(userId, dto);
  }

  @Get(':branchId/:productId/movements')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'View movement history for a product at a branch' })
  getMovements(
    @Param('branchId', ParseIntPipe) branchId: number,
    @Param('productId', ParseIntPipe) productId: number,
  ) {
    return this.inventoryService.getMovements(branchId, productId);
  }
}