import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { GenerateSalesReportDto } from './dto/generate-sales-report.dto';
import { GenerateInventoryReportDto } from './dto/generate-inventory-report.dto';
import { GenerateFinancialReportDto } from './dto/generate-financial-report.dto';
import { CreateReportScheduleDto } from './dto/create-report-schedule.dto';

@Injectable()
export class ReportingService {
  constructor(private readonly prisma: PrismaService) {}

  // ─── SALES REPORT ─────────────────────────────────
  async generateSalesReport(userId: number, dto: GenerateSalesReportDto) {
    const where: any = {
      saleDate: {
        gte: new Date(dto.dateFrom),
        lte: new Date(dto.dateTo),
      },
    };
    if (dto.branchId) where.branchId = dto.branchId;

    const sales = await this.prisma.sale.findMany({ where });

    const totalSales = sales.reduce((sum, s) => sum + Number(s.grandTotal), 0);
    const totalTransactions = sales.length;
    const totalDiscount = sales.reduce((sum, s) => sum + Number(s.discount), 0);
    const totalTax = sales.reduce((sum, s) => sum + Number(s.tax), 0);
    const netSales = totalSales - totalDiscount - totalTax;

    const report = await this.prisma.salesReport.create({
      data: {
        branchId: dto.branchId ?? 1, // branchId is required; fallback to 1
        reportDate: new Date(),
        totalSales,
        totalTransactions,
        totalDiscount,
        totalTax,
        netSales,
        generatedBy: userId,
      },
    });

    await this.prisma.reportLog.create({
      data: {
        reportType: 'sales',
        reportId: report.reportId,
        generatedBy: userId,
        fileLocation: null, // corrected field name
        status: 'COMPLETED',
      },
    });

    return report;
  }

  async listSalesReports(branchId?: number) {
    return this.prisma.salesReport.findMany({
      where: branchId ? { branchId } : {},
      orderBy: { generatedAt: 'desc' },
      include: { generator: { select: { userId: true, fullName: true } } },
    });
  }

  async getSalesReport(id: number) {
    return this.prisma.salesReport.findUnique({
      where: { reportId: id },
      include: { generator: { select: { userId: true, fullName: true } } },
    });
  }

  // ─── INVENTORY REPORT ─────────────────────────────
  async generateInventoryReport(userId: number, dto: GenerateInventoryReportDto) {
    const where: any = {};
    if (dto.branchId) where.branchId = dto.branchId;

    const inventory = await this.prisma.inventory.findMany({
      where,
      include: { product: true },
    });

    const totalProducts = inventory.length;
    const totalStock = inventory.reduce((sum, i) => sum + i.quantity, 0);
    const totalValue = inventory.reduce(
      (sum, i) => sum + Number(i.product.costPrice) * i.quantity,
      0,
    );
    const lowStockItems = inventory.filter(
      (i) => i.quantity <= i.product.reorderLevel,
    ).length;
    const outOfStockItems = inventory.filter((i) => i.quantity === 0).length;

    const report = await this.prisma.inventoryReport.create({
      data: {
        branchId: dto.branchId ?? 1,
        reportDate: new Date(),
        totalProducts,
        totalStock,
        totalValue,
        lowStockItems,
        outOfStockItems,
        generatedBy: userId,
      },
    });

    await this.prisma.reportLog.create({
      data: {
        reportType: 'inventory',
        reportId: report.reportId,
        generatedBy: userId,
        fileLocation: null,
        status: 'COMPLETED',
      },
    });

    return report;
  }

  async listInventoryReports(branchId?: number) {
    return this.prisma.inventoryReport.findMany({
      where: branchId ? { branchId } : {},
      orderBy: { generatedAt: 'desc' },
      include: { generator: { select: { userId: true, fullName: true } } },
    });
  }

  async getInventoryReport(id: number) {
    return this.prisma.inventoryReport.findUnique({
      where: { reportId: id },
      include: { generator: { select: { userId: true, fullName: true } } },
    });
  }

  // ─── FINANCIAL REPORT ─────────────────────────────
  async generateFinancialReport(userId: number, dto: GenerateFinancialReportDto) {
    const where: any = {
      saleDate: {
        gte: new Date(dto.startDate),
        lte: new Date(dto.endDate),
      },
    };
    if (dto.branchId) where.branchId = dto.branchId;

    const sales = await this.prisma.sale.findMany({ where });
    const totalSales = sales.reduce((sum, s) => sum + Number(s.grandTotal), 0);

    const saleItems = await this.prisma.saleItem.findMany({
      where: { sale: where },
      include: { product: { select: { costPrice: true } } },
    });
    const costOfGoodsSold = saleItems.reduce(
      (sum, item) => sum + Number(item.product.costPrice) * item.quantity,
      0,
    );

    const expenses = await this.prisma.expense.findMany({
      where: { isActive: true, ...(dto.branchId ? { branchId: dto.branchId } : {}) },
    });
    const totalExpenses = expenses.reduce((sum, e) => sum + Number(e.amount), 0);

    const grossProfit = totalSales - costOfGoodsSold;
    const netProfit = grossProfit - totalExpenses;

    const report = await this.prisma.financialReport.create({
      data: {
        branchId: dto.branchId ?? 1,
        periodStart: new Date(dto.startDate),
        periodEnd: new Date(dto.endDate),
        totalSales,
        costOfGoodsSold,
        grossProfit,
        totalExpenses,
        netProfit,
        generatedBy: userId,
      },
    });

    await this.prisma.reportLog.create({
      data: {
        reportType: 'financial',
        reportId: report.reportId,
        generatedBy: userId,
        fileLocation: null,
        status: 'COMPLETED',
      },
    });

    return report;
  }

  async listFinancialReports(branchId?: number) {
    return this.prisma.financialReport.findMany({
      where: branchId ? { branchId } : {},
      orderBy: { generatedAt: 'desc' },
      include: { generator: { select: { userId: true, fullName: true } } },
    });
  }

  async getFinancialReport(id: number) {
    return this.prisma.financialReport.findUnique({
      where: { reportId: id },
      include: { generator: { select: { userId: true, fullName: true } } },
    });
  }

  // ─── REPORT LOGS ──────────────────────────────────
  async listReportLogs() {
    return this.prisma.reportLog.findMany({
      orderBy: { generatedAt: 'desc' },
      include: { generator: { select: { userId: true, fullName: true } } },
    });
  }

  // ─── SCHEDULES ────────────────────────────────────
  async createSchedule(dto: CreateReportScheduleDto) {
    return this.prisma.reportSchedule.create({
      data: {
        reportType: dto.reportType,
        frequency: dto.frequency,
        dailyTime: dto.dailyTime ?? '00:00', // default required field
        branchId: dto.branchId ?? 1,
        emailRecipient: dto.emailRecipient,
        status: 'active',
      },
    });
  }

  async listSchedules() {
    return this.prisma.reportSchedule.findMany({
      include: { branch: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async deleteSchedule(id: number) {
    return this.prisma.reportSchedule.delete({ where: { scheduleId: id } });
  }
}