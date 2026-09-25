import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
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
import { ReportingService } from './reporting.service';
import { GenerateSalesReportDto } from './dto/generate-sales-report.dto';
import { GenerateInventoryReportDto } from './dto/generate-inventory-report.dto';
import { GenerateFinancialReportDto } from './dto/generate-financial-report.dto';
import { CreateReportScheduleDto } from './dto/create-report-schedule.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { SubscriptionGuard } from '../../common/guards/subscription.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { GetUser } from '../../common/decorators/get-user.decorator';

@ApiTags('Reports')
@Controller('reports')
@UseGuards(JwtAuthGuard, RolesGuard, SubscriptionGuard)
@Roles('ADMIN', 'SUPER_ADMIN', 'IT_ADMIN', 'MANAGEMENT', 'BUSINESS_ADMIN')
@ApiBearerAuth()
export class ReportingController {
  constructor(private readonly reportingService: ReportingService) {}

  // ─── BUSINESS OVERVIEW (live, no persistence) ──────────
  @Get('business/overview')
  @ApiOperation({
    summary:
      'Live business-wide aggregate (sales, expenses, profit, top products/customers). Not persisted.',
  })
  @ApiQuery({ name: 'branchId', required: false, type: Number })
  @ApiQuery({
    name: 'businessId',
    required: false,
    type: Number,
    description: 'Required for platform admins',
  })
  @ApiQuery({ name: 'dateFrom', required: true, type: String })
  @ApiQuery({ name: 'dateTo', required: true, type: String })
  businessOverview(
    @GetUser('userId') userId: number,
    @Query('branchId') branchId?: string,
    @Query('businessId') businessId?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.reportingService.getBusinessOverview(userId, {
      branchId: branchId ? parseInt(branchId, 10) : undefined,
      businessId: businessId ? parseInt(businessId, 10) : undefined,
      dateFrom,
      dateTo,
      startDate,
      endDate,
    });
  }

  // ─── SALES REPORTS ────────────────────────────────────
  @Post('sales')
  @ApiOperation({ summary: 'Generate and persist a sales report for a branch' })
  generateSales(
    @GetUser('userId') userId: number,
    @Body() dto: GenerateSalesReportDto,
  ) {
    return this.reportingService.generateSalesReport(userId, dto);
  }

  @Get('sales')
  @ApiOperation({ summary: 'List persisted sales reports (scoped)' })
  @ApiQuery({ name: 'branchId', required: false, type: Number })
  listSales(
    @GetUser('userId') userId: number,
    @Query('branchId') branchId?: string,
  ) {
    return this.reportingService.listSalesReports(
      userId,
      branchId ? parseInt(branchId, 10) : undefined,
    );
  }

  @Get('sales/:id')
  @ApiOperation({ summary: 'Get a persisted sales report by ID' })
  getSales(
    @Param('id', ParseIntPipe) id: number,
    @GetUser('userId') userId: number,
  ) {
    return this.reportingService.getSalesReport(id, userId);
  }

  // ─── INVENTORY REPORTS ────────────────────────────────
  @Post('inventory')
  @ApiOperation({ summary: 'Generate and persist an inventory report for a branch' })
  generateInventory(
    @GetUser('userId') userId: number,
    @Body() dto: GenerateInventoryReportDto,
  ) {
    return this.reportingService.generateInventoryReport(userId, dto);
  }

  @Get('inventory')
  @ApiOperation({ summary: 'List persisted inventory reports (scoped)' })
  @ApiQuery({ name: 'branchId', required: false, type: Number })
  listInventory(
    @GetUser('userId') userId: number,
    @Query('branchId') branchId?: string,
  ) {
    return this.reportingService.listInventoryReports(
      userId,
      branchId ? parseInt(branchId, 10) : undefined,
    );
  }

  @Get('inventory/:id')
  @ApiOperation({ summary: 'Get a persisted inventory report by ID' })
  getInventory(
    @Param('id', ParseIntPipe) id: number,
    @GetUser('userId') userId: number,
  ) {
    return this.reportingService.getInventoryReport(id, userId);
  }

  // ─── FINANCIAL REPORTS ────────────────────────────────
  @Post('financial')
  @ApiOperation({ summary: 'Generate and persist a financial report for a branch' })
  generateFinancial(
    @GetUser('userId') userId: number,
    @Body() dto: GenerateFinancialReportDto,
  ) {
    return this.reportingService.generateFinancialReport(userId, dto);
  }

  @Get('financial')
  @ApiOperation({ summary: 'List persisted financial reports (scoped)' })
  @ApiQuery({ name: 'branchId', required: false, type: Number })
  listFinancial(
    @GetUser('userId') userId: number,
    @Query('branchId') branchId?: string,
  ) {
    return this.reportingService.listFinancialReports(
      userId,
      branchId ? parseInt(branchId, 10) : undefined,
    );
  }

  @Get('financial/:id')
  @ApiOperation({ summary: 'Get a persisted financial report by ID' })
  getFinancial(
    @Param('id', ParseIntPipe) id: number,
    @GetUser('userId') userId: number,
  ) {
    return this.reportingService.getFinancialReport(id, userId);
  }

  // ─── REPORT LOGS ──────────────────────────────────────
  @Get('logs')
  @ApiOperation({ summary: 'List report generation logs' })
  listLogs(@GetUser('userId') userId: number) {
    return this.reportingService.listReportLogs(userId);
  }

  // ─── SCHEDULES ────────────────────────────────────────
  @Post('schedules')
  @ApiOperation({ summary: 'Create a recurring report schedule' })
  createSchedule(
    @GetUser('userId') userId: number,
    @Body() dto: CreateReportScheduleDto,
  ) {
    return this.reportingService.createSchedule(dto, userId);
  }

  @Get('schedules')
  @ApiOperation({ summary: 'List report schedules (scoped)' })
  listSchedules(@GetUser('userId') userId: number) {
    return this.reportingService.listSchedules(userId);
  }

  @Delete('schedules/:id')
  @ApiOperation({ summary: 'Delete a report schedule' })
  deleteSchedule(
    @Param('id', ParseIntPipe) id: number,
    @GetUser('userId') userId: number,
  ) {
    return this.reportingService.deleteSchedule(id, userId);
  }
}