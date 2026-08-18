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
import { Roles } from '../../common/decorators/roles.decorator';
import { GetUser } from '../../common/decorators/get-user.decorator';
import { SubscriptionGuard } from '../../common/guards/subscription.guard';

@ApiTags('Reports')
@Controller('reports')
@UseGuards(JwtAuthGuard, RolesGuard, SubscriptionGuard)
@Roles('ADMIN', 'SUPER_ADMIN', 'IT_ADMIN')
@ApiBearerAuth()
export class ReportingController {
  constructor(private readonly reportingService: ReportingService) {}

  // Sales
  @Post('sales')
  @ApiOperation({ summary: 'Generate sales report' })
  generateSales(
    @GetUser('userId') userId: number,
    @Body() dto: GenerateSalesReportDto,
  ) {
    return this.reportingService.generateSalesReport(userId, dto);
  }

  @Get('sales')
  @ApiOperation({ summary: 'List sales reports' })
  @ApiQuery({ name: 'branchId', required: false, type: Number })
  listSales(@Query('branchId') branchId?: string) {
    return this.reportingService.listSalesReports(
      branchId ? parseInt(branchId, 10) : undefined,
    );
  }

  @Get('sales/:id')
  @ApiOperation({ summary: 'Get single sales report' })
  getSales(@Param('id', ParseIntPipe) id: number) {
    return this.reportingService.getSalesReport(id);
  }

  // Inventory
  @Post('inventory')
  @ApiOperation({ summary: 'Generate inventory report' })
  generateInventory(
    @GetUser('userId') userId: number,
    @Body() dto: GenerateInventoryReportDto,
  ) {
    return this.reportingService.generateInventoryReport(userId, dto);
  }

  @Get('inventory')
  @ApiOperation({ summary: 'List inventory reports' })
  @ApiQuery({ name: 'branchId', required: false, type: Number })
  listInventory(@Query('branchId') branchId?: string) {
    return this.reportingService.listInventoryReports(
      branchId ? parseInt(branchId, 10) : undefined,
    );
  }

  @Get('inventory/:id')
  @ApiOperation({ summary: 'Get single inventory report' })
  getInventory(@Param('id', ParseIntPipe) id: number) {
    return this.reportingService.getInventoryReport(id);
  }

  // Financial
  @Post('financial')
  @ApiOperation({ summary: 'Generate financial report' })
  generateFinancial(
    @GetUser('userId') userId: number,
    @Body() dto: GenerateFinancialReportDto,
  ) {
    return this.reportingService.generateFinancialReport(userId, dto);
  }

  @Get('financial')
  @ApiOperation({ summary: 'List financial reports' })
  @ApiQuery({ name: 'branchId', required: false, type: Number })
  listFinancial(@Query('branchId') branchId?: string) {
    return this.reportingService.listFinancialReports(
      branchId ? parseInt(branchId, 10) : undefined,
    );
  }

  @Get('financial/:id')
  @ApiOperation({ summary: 'Get single financial report' })
  getFinancial(@Param('id', ParseIntPipe) id: number) {
    return this.reportingService.getFinancialReport(id);
  }

  // Logs
  @Get('logs')
  @ApiOperation({ summary: 'List report generation logs' })
  listLogs() {
    return this.reportingService.listReportLogs();
  }

  // Schedules
  @Post('schedules')
  @ApiOperation({ summary: 'Create report schedule' })
  createSchedule(@Body() dto: CreateReportScheduleDto) {
    return this.reportingService.createSchedule(dto);
  }

  @Get('schedules')
  @ApiOperation({ summary: 'List report schedules' })
  listSchedules() {
    return this.reportingService.listSchedules();
  }

  @Delete('schedules/:id')
  @ApiOperation({ summary: 'Delete report schedule' })
  deleteSchedule(@Param('id', ParseIntPipe) id: number) {
    return this.reportingService.deleteSchedule(id);
  }
}