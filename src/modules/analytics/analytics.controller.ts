import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { AnalyticsService } from './analytics.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { SubscriptionGuard } from '../../common/guards/subscription.guard';

@ApiTags('Analytics')
@Controller('analytics')
@UseGuards(JwtAuthGuard, RolesGuard, SubscriptionGuard)
@Roles('ADMIN', 'SUPER_ADMIN', 'IT_ADMIN', 'MANAGEMENT')
@ApiBearerAuth()
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('overview')
  @ApiOperation({ summary: 'High-level dashboard stats' })
  @ApiQuery({ name: 'branchId', required: false, type: Number })
  overview(@Query('branchId') branchId?: string) {
    return this.analyticsService.getOverview(branchId ? parseInt(branchId) : undefined);
  }

  @Get('business-snapshot')
  @ApiOperation({ summary: 'Card-level dashboard stats' })
  @ApiQuery({ name: 'branchId', required: false, type: Number })
  businessSnapshot(@Query('branchId') branchId?: string) {
    return this.analyticsService.getBusinessSnapshot(branchId ? parseInt(branchId) : undefined);
  }

  @Get('sales-overview')
  @ApiOperation({ summary: 'Sales trend analysis' })
  @ApiQuery({ name: 'branchId', required: false, type: Number })
  @ApiQuery({ name: 'dateFrom', required: false, type: String })
  @ApiQuery({ name: 'dateTo', required: false, type: String })
  @ApiQuery({ name: 'cashierId', required: false, type: Number })
  @ApiQuery({ name: 'posId', required: false, type: String })
  salesOverview(
    @Query('branchId') branchId?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
    @Query('cashierId') cashierId?: string,
    @Query('posId') posId?: string,
  ) {
    return this.analyticsService.getSalesOverview({
      branchId: branchId ? parseInt(branchId) : undefined,
      dateFrom,
      dateTo,
      cashierId: cashierId ? parseInt(cashierId) : undefined,
      posId,
    });
  }

  @Get('top-selling-products')
  @ApiOperation({ summary: 'Best performing products' })
  topSellingProducts() {
    return this.analyticsService.getTopSellingProducts();
  }

  @Get('sales-by-branch')
  @ApiOperation({ summary: 'Multi-branch comparison' })
  salesByBranch() {
    return this.analyticsService.getSalesByBranch();
  }

  @Get('transactions')
  @ApiOperation({ summary: 'Transaction status breakdown' })
  @ApiQuery({ name: 'branchId', required: false, type: Number })
  transactions(@Query('branchId') branchId?: string) {
    return this.analyticsService.getTransactions(branchId ? parseInt(branchId) : undefined);
  }

  @Get('payment-overview')
  @ApiOperation({ summary: 'Payment method breakdown' })
  @ApiQuery({ name: 'branchId', required: false, type: Number })
  paymentOverview(@Query('branchId') branchId?: string) {
    return this.analyticsService.getPaymentOverview(branchId ? parseInt(branchId) : undefined);
  }

  @Get('inventory-summary')
  @ApiOperation({ summary: 'Stock position' })
  @ApiQuery({ name: 'branchId', required: false, type: Number })
  inventorySummary(@Query('branchId') branchId?: string) {
    return this.analyticsService.getInventorySummary(branchId ? parseInt(branchId) : undefined);
  }

  @Get('inventory-movement')
  @ApiOperation({ summary: 'Movement breakdown' })
  @ApiQuery({ name: 'branchId', required: false, type: Number })
  inventoryMovement(@Query('branchId') branchId?: string) {
    return this.analyticsService.getInventoryMovement(branchId ? parseInt(branchId) : undefined);
  }

  @Get('low-stock')
  @ApiOperation({ summary: 'Low stock items' })
  @ApiQuery({ name: 'branchId', required: false, type: Number })
  lowStock(@Query('branchId') branchId?: string) {
    return this.analyticsService.getLowStock(branchId ? parseInt(branchId) : undefined);
  }

  @Get('expenses-overview')
  @ApiOperation({ summary: 'Expense breakdown' })
  @ApiQuery({ name: 'branchId', required: false, type: Number })
  expensesOverview(@Query('branchId') branchId?: string) {
    return this.analyticsService.getExpensesOverview(branchId ? parseInt(branchId) : undefined);
  }

  @Get('customers')
  @ApiOperation({ summary: 'Customer stats' })
  customers() {
    return this.analyticsService.getCustomers();
  }

  @Get('top-customers')
  @ApiOperation({ summary: 'Highest spending customers' })
  topCustomers() {
    return this.analyticsService.getTopCustomers();
  }

  @Get('sales-by-category')
  @ApiOperation({ summary: 'Revenue per category' })
  salesByCategory() {
    return this.analyticsService.getSalesByCategory();
  }

  @Get('sales-by-pos')
  @ApiOperation({ summary: 'Performance per POS' })
  salesByPos() {
    return this.analyticsService.getSalesByPos();
  }

  @Get('sales-by-cashier')
  @ApiOperation({ summary: 'Performance per staff' })
  salesByCashier() {
    return this.analyticsService.getSalesByCashier();
  }

  @Get('profit')
  @ApiOperation({ summary: 'Profit and COGS summary' })
  @ApiQuery({ name: 'branchId', required: false, type: Number })
  profit(@Query('branchId') branchId?: string) {
    return this.analyticsService.getProfit(branchId ? parseInt(branchId) : undefined);
  }
}