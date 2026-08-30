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
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
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

  @Post('sales')
  generateSales(@GetUser('userId') userId: number, @Body() dto: GenerateSalesReportDto) {
    return this.reportingService.generateSalesReport(userId, dto);
  }

  @Get('sales')
  listSales(@Query('branchId') branchId?: string) {
    return this.reportingService.listSalesReports(branchId ? parseInt(branchId, 10) : undefined);
  }

  @Get('sales/:id')
  getSales(@Param('id', ParseIntPipe) id: number) {
    return this.reportingService.getSalesReport(id);
  }

  @Post('inventory')
  generateInventory(@GetUser('userId') userId: number, @Body() dto: GenerateInventoryReportDto) {
    return this.reportingService.generateInventoryReport(userId, dto);
  }

  @Get('inventory')
  listInventory(@Query('branchId') branchId?: string) {
    return this.reportingService.listInventoryReports(branchId ? parseInt(branchId, 10) : undefined);
  }

  @Get('inventory/:id')
  getInventory(@Param('id', ParseIntPipe) id: number) {
    return this.reportingService.getInventoryReport(id);
  }

  @Post('financial')
  generateFinancial(@GetUser('userId') userId: number, @Body() dto: GenerateFinancialReportDto) {
    return this.reportingService.generateFinancialReport(userId, dto);
  }

  @Get('financial')
  listFinancial(@Query('branchId') branchId?: string) {
    return this.reportingService.listFinancialReports(branchId ? parseInt(branchId, 10) : undefined);
  }

  @Get('financial/:id')
  getFinancial(@Param('id', ParseIntPipe) id: number) {
    return this.reportingService.getFinancialReport(id);
  }

  @Get('logs')
  listLogs() {
    return this.reportingService.listReportLogs();
  }

  @Post('schedules')
  createSchedule(@Body() dto: CreateReportScheduleDto) {
    return this.reportingService.createSchedule(dto);
  }

  @Get('schedules')
  listSchedules() {
    return this.reportingService.listSchedules();
  }

  @Delete('schedules/:id')
  deleteSchedule(@Param('id', ParseIntPipe) id: number) {
    return this.reportingService.deleteSchedule(id);
  }
}