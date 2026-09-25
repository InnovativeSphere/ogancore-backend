import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { GenerateSalesReportDto } from './dto/generate-sales-report.dto';
import { GenerateInventoryReportDto } from './dto/generate-inventory-report.dto';
import { GenerateFinancialReportDto } from './dto/generate-financial-report.dto';
import { CreateReportScheduleDto } from './dto/create-report-schedule.dto';
import {
  SaleStatus,
  InvoiceStatus,
  ExpenseStatus,
  Prisma,
} from '@prisma/client';

@Injectable()
export class ReportingService {
  constructor(private readonly prisma: PrismaService) {}

  // ─── SCOPING HELPERS ────────────────────────────────────

  private isPlatformAdmin(roleName?: string): boolean {
    return roleName === 'SUPER_ADMIN' || roleName === 'IT_ADMIN';
  }

  private async getUserContext(userId: number) {
    const user = await this.prisma.user.findUnique({
      where: { userId },
      select: {
        userId: true,
        role: { select: { roleName: true } },
        branch: { select: { businessId: true, branchId: true } },
      },
    });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  /**
   * Resolves the effective scope of a report request.
   *
   * - Business admin → business locked to their own. If branchId is provided,
   *   it must belong to their business. If omitted, report is business-wide.
   * - Platform admin → can scope by businessId and/or branchId, or see all.
   *
   * Returns: { businessId, branchId, branchIds }
   *   - businessId: null when platform admin with no filter
   *   - branchId: null when the request is business-wide
   *   - branchIds: the array of branch IDs to aggregate, or null when platform-wide
   */
  private async resolveReportScope(
    userId: number,
    requestedBranchId?: number,
    requestedBusinessId?: number,
  ): Promise<{
    businessId: number | null;
    branchId: number | null;
    branchIds: number[] | null;
  }> {
    const user = await this.getUserContext(userId);
    const roleName = user.role?.roleName;

    // ─── Business admin: fully locked ───────────────────────
    if (roleName === 'BUSINESS_ADMIN') {
      const businessId = user.branch?.businessId ?? null;
      if (!businessId) {
        throw new ForbiddenException('Your account is not linked to a business');
      }

      if (requestedBranchId) {
        const branch = await this.prisma.branch.findUnique({
          where: { branchId: requestedBranchId },
          select: { businessId: true },
        });
        if (!branch || branch.businessId !== businessId) {
          throw new ForbiddenException(
            'You can only generate reports for your own business',
          );
        }
        return { businessId, branchId: requestedBranchId, branchIds: [requestedBranchId] };
      }

      // No branchId → business-wide
      const branches = await this.prisma.branch.findMany({
        where: { businessId },
        select: { branchId: true },
      });
      return {
        businessId,
        branchId: null,
        branchIds: branches.map((b) => b.branchId),
      };
    }

    // ─── Platform admin: flexible ───────────────────────────
    if (this.isPlatformAdmin(roleName)) {
      if (requestedBranchId) {
        const branch = await this.prisma.branch.findUnique({
          where: { branchId: requestedBranchId },
          select: { businessId: true },
        });
        if (!branch) throw new BadRequestException('Branch not found');
        return {
          businessId: requestedBusinessId ?? branch.businessId ?? null,
          branchId: requestedBranchId,
          branchIds: [requestedBranchId],
        };
      }

      if (requestedBusinessId) {
        const branches = await this.prisma.branch.findMany({
          where: { businessId: requestedBusinessId },
          select: { branchId: true },
        });
        return {
          businessId: requestedBusinessId,
          branchId: null,
          branchIds: branches.map((b) => b.branchId),
        };
      }

      // No filter → platform-wide
      return { businessId: null, branchId: null, branchIds: null };
    }

    throw new ForbiddenException('You do not have permission to view reports');
  }

  /**
   * Resolves a date range from either (dateFrom, dateTo) or (startDate, endDate).
   * Prefers the new convention. Throws if neither pair is complete.
   */
  private resolveDateRange(dto: {
    dateFrom?: string;
    dateTo?: string;
    startDate?: string;
    endDate?: string;
  }): { from: Date; to: Date } {
    const fromStr = dto.dateFrom ?? dto.startDate;
    const toStr = dto.dateTo ?? dto.endDate;

    if (!fromStr || !toStr) {
      throw new BadRequestException(
        'A complete date range is required (dateFrom/dateTo or startDate/endDate)',
      );
    }

    const from = new Date(fromStr);
    const to = new Date(toStr);
    if (isNaN(from.getTime()) || isNaN(to.getTime())) {
      throw new BadRequestException('Invalid date range');
    }
    if (from > to) {
      throw new BadRequestException('Start date must be before end date');
    }
    return { from, to };
  }

  // ─── SALES REPORT ──────────────────────────────────────
  async generateSalesReport(userId: number, dto: GenerateSalesReportDto) {
    const { branchId, branchIds } = await this.resolveReportScope(
      userId,
      dto.branchId,
    );

    // Persisted reports require a specific branch (schema has branch_id NOT NULL)
    if (!branchId) {
      throw new BadRequestException(
        'A specific branchId is required for persisted reports. Use /reports/business/overview for cross-branch aggregates.',
      );
    }
    const { from, to } = this.resolveDateRange(dto);

    const where: any = {
      branchId,
      saleDate: { gte: from, lte: to },
    };

    const sales = await this.prisma.sale.findMany({ where });

    const totalSales = sales.reduce((sum, s) => sum + Number(s.grandTotal), 0);
    const totalTransactions = sales.length;
    const totalDiscount = sales.reduce((sum, s) => sum + Number(s.discount), 0);
    const totalTax = sales.reduce((sum, s) => sum + Number(s.tax), 0);
    const netSales = totalSales - totalDiscount - totalTax;

    const report = await this.prisma.salesReport.create({
      data: {
        branchId,
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
        fileLocation: null,
        status: 'COMPLETED',
      },
    });

    return report;
  }

  async listSalesReports(userId: number, branchId?: number) {
    const scope = await this.resolveReportScope(userId, branchId);
    const where: any = {};

    if (scope.branchId) {
      where.branchId = scope.branchId;
    } else if (scope.branchIds) {
      where.branchId = { in: scope.branchIds };
    }
    // platform admin with no filter → all

    return this.prisma.salesReport.findMany({
      where,
      orderBy: { generatedAt: 'desc' },
      include: { generator: { select: { userId: true, fullName: true } } },
    });
  }

  async getSalesReport(id: number, userId: number) {
    const report = await this.prisma.salesReport.findUnique({
      where: { reportId: id },
      include: { generator: { select: { userId: true, fullName: true } } },
    });
    if (!report) throw new NotFoundException('Sales report not found');

    await this.assertReportAccess(report.branchId, userId);
    return report;
  }

  // ─── INVENTORY REPORT ──────────────────────────────────
  async generateInventoryReport(userId: number, dto: GenerateInventoryReportDto) {
    const { branchId } = await this.resolveReportScope(userId, dto.branchId);

    if (!branchId) {
      throw new BadRequestException(
        'A specific branchId is required for persisted reports. Use /reports/business/overview for cross-branch aggregates.',
      );
    }

    const { from, to } = this.resolveDateRange({
      dateFrom: dto.dateFrom,
      dateTo: dto.dateTo,
    });

    const inventory = await this.prisma.inventory.findMany({
      where: { branchId },
      include: { product: true },
    });

    // Movement activity within the date range (for the report log; keeps shape stable)
    await this.prisma.inventoryMovement.findMany({
      where: { branchId, createdAt: { gte: from, lte: to } },
      select: { movementId: true },
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
        branchId,
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

  async listInventoryReports(userId: number, branchId?: number) {
    const scope = await this.resolveReportScope(userId, branchId);
    const where: any = {};
    if (scope.branchId) where.branchId = scope.branchId;
    else if (scope.branchIds) where.branchId = { in: scope.branchIds };

    return this.prisma.inventoryReport.findMany({
      where,
      orderBy: { generatedAt: 'desc' },
      include: { generator: { select: { userId: true, fullName: true } } },
    });
  }

  async getInventoryReport(id: number, userId: number) {
    const report = await this.prisma.inventoryReport.findUnique({
      where: { reportId: id },
      include: { generator: { select: { userId: true, fullName: true } } },
    });
    if (!report) throw new NotFoundException('Inventory report not found');

    await this.assertReportAccess(report.branchId, userId);
    return report;
  }

  // ─── FINANCIAL REPORT ──────────────────────────────────
  async generateFinancialReport(userId: number, dto: GenerateFinancialReportDto) {
    const { branchId } = await this.resolveReportScope(userId, dto.branchId);

    if (!branchId) {
      throw new BadRequestException(
        'A specific branchId is required for persisted reports. Use /reports/business/overview for cross-branch aggregates.',
      );
    }

    const { from, to } = this.resolveDateRange(dto);

    const sales = await this.prisma.sale.findMany({
      where: { branchId, saleDate: { gte: from, lte: to } },
    });
    const totalSales = sales.reduce((sum, s) => sum + Number(s.grandTotal), 0);

    const saleItems = await this.prisma.saleItem.findMany({
      where: { sale: { branchId, saleDate: { gte: from, lte: to } } },
      include: { product: { select: { costPrice: true } } },
    });
    const costOfGoodsSold = saleItems.reduce(
      (sum, item) => sum + Number(item.product.costPrice) * item.quantity,
      0,
    );

    const expenses = await this.prisma.expense.findMany({
      where: {
        branchId,
        isActive: true,
        expenseDate: { gte: from, lte: to },
      },
    });
    const totalExpenses = expenses.reduce((sum, e) => sum + Number(e.amount), 0);

    const grossProfit = totalSales - costOfGoodsSold;
    const netProfit = grossProfit - totalExpenses;

    const report = await this.prisma.financialReport.create({
      data: {
        branchId,
        periodStart: from,
        periodEnd: to,
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

  async listFinancialReports(userId: number, branchId?: number) {
    const scope = await this.resolveReportScope(userId, branchId);
    const where: any = {};
    if (scope.branchId) where.branchId = scope.branchId;
    else if (scope.branchIds) where.branchId = { in: scope.branchIds };

    return this.prisma.financialReport.findMany({
      where,
      orderBy: { generatedAt: 'desc' },
      include: { generator: { select: { userId: true, fullName: true } } },
    });
  }

  async getFinancialReport(id: number, userId: number) {
    const report = await this.prisma.financialReport.findUnique({
      where: { reportId: id },
      include: { generator: { select: { userId: true, fullName: true } } },
    });
    if (!report) throw new NotFoundException('Financial report not found');

    await this.assertReportAccess(report.branchId, userId);
    return report;
  }

  // ─── LIVE BUSINESS OVERVIEW ────────────────────────────
  /**
   * Live business-wide aggregate. Not persisted. Computed on request.
   * Accepts both date conventions. Returns totals, top products, top customers,
   * and a daily breakdown.
   */
  // ─── LIVE BUSINESS OVERVIEW ────────────────────────────
  /**
   * Live business-wide aggregate. Not persisted. Computed on request.
   * Accepts both date conventions. Returns totals, top products, top customers,
   * and a daily breakdown.
   *
   * RBAC:
   *  - Business admins: scope locked to their business (branch optional)
   *  - Platform admins: MUST pass businessId or branchId — no platform-wide overview
   */
  async getBusinessOverview(
    userId: number,
    params: {
      branchId?: number;
      businessId?: number;
      dateFrom?: string;
      dateTo?: string;
      startDate?: string;
      endDate?: string;
    },
  ) {
    const scope = await this.resolveReportScope(
      userId,
      params.branchId,
      params.businessId,
    );

    // Platform admins must drill into a specific business — no all-tenant view.
    if (scope.businessId === null) {
      throw new BadRequestException(
        'A businessId or branchId is required. Platform-wide overview is not available on this endpoint.',
      );
    }

    const { from, to } = this.resolveDateRange(params);

    const branchFilter: any = {};
    if (scope.branchId) branchFilter.branchId = scope.branchId;
    else if (scope.branchIds) branchFilter.branchId = { in: scope.branchIds };

    // ─── Sales ─────────────────────────────────────────────
    const sales = await this.prisma.sale.findMany({
      where: {
        ...branchFilter,
        saleDate: { gte: from, lte: to },
        status: SaleStatus.COMPLETED,
      },
      include: { items: true },
    });

    const totalSales = sales.reduce((sum, s) => sum + Number(s.grandTotal), 0);
    const totalTransactions = sales.length;
    const totalItemsSold = sales.reduce(
      (sum, s) => sum + s.items.reduce((is, it) => is + it.quantity, 0),
      0,
    );
    const averageOrderValue =
      totalTransactions > 0 ? totalSales / totalTransactions : 0;

    // ─── Expenses ──────────────────────────────────────────
    const expenses = await this.prisma.expense.findMany({
      where: {
        ...branchFilter,
        isActive: true,
        expenseDate: { gte: from, lte: to },
      },
    });
    const totalExpenses = expenses.reduce((sum, e) => sum + Number(e.amount), 0);

    // ─── COGS + Gross Profit ───────────────────────────────
    const saleItems = await this.prisma.saleItem.findMany({
      where: {
        sale: {
          ...branchFilter,
          saleDate: { gte: from, lte: to },
          status: SaleStatus.COMPLETED,
        },
      },
      include: { product: { select: { costPrice: true } } },
    });
    const costOfGoodsSold = saleItems.reduce(
      (sum, item) => sum + Number(item.product.costPrice) * item.quantity,
      0,
    );
    const grossProfit = totalSales - costOfGoodsSold;
    const netProfit = grossProfit - totalExpenses;

    // ─── Invoices (business-scoped, excludes VOIDED) ───────
    // Business scoping always applies; branch scope includes branch-tagged
    // invoices PLUS business-level ones (branchId = null).
    const invoiceWhere: any = {
      businessId: scope.businessId,
      status: { not: InvoiceStatus.VOIDED },
      issueDate: { gte: from, lte: to },
    };
    if (scope.branchId) {
      invoiceWhere.OR = [
        { branchId: scope.branchId },
        { branchId: null },
      ];
    }

    const invoices = await this.prisma.invoice.findMany({
      where: invoiceWhere,
      select: { totalAmount: true, status: true },
    });
    const totalInvoiced = invoices.reduce(
      (sum, i) => sum + Number(i.totalAmount),
      0,
    );

    // ─── Top 5 Products ────────────────────────────────────
    const productMap = new Map<
      number,
      { productId: number; name: string; quantity: number; revenue: number }
    >();
    for (const item of saleItems) {
      const product = await this.prisma.product.findUnique({
        where: { productId: item.productId },
        select: { productId: true, productName: true },
      });
      if (!product) continue;
      const existing = productMap.get(product.productId) || {
        productId: product.productId,
        name: product.productName,
        quantity: 0,
        revenue: 0,
      };
      existing.quantity += item.quantity;
      existing.revenue += Number(item.totalPrice);
      productMap.set(product.productId, existing);
    }
    const topProducts = Array.from(productMap.values())
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);

    // ─── Top 5 Customers ───────────────────────────────────
    const customerMap = new Map<
      number,
      { customerId: number; name: string; totalSpent: number; transactions: number }
    >();
    for (const sale of sales) {
      if (!sale.customerId) continue;
      const customer = await this.prisma.customer.findUnique({
        where: { customerId: sale.customerId },
        select: { customerId: true, name: true },
      });
      if (!customer) continue;
      const existing = customerMap.get(customer.customerId) || {
        customerId: customer.customerId,
        name: customer.name,
        totalSpent: 0,
        transactions: 0,
      };
      existing.totalSpent += Number(sale.grandTotal);
      existing.transactions += 1;
      customerMap.set(customer.customerId, existing);
    }
    const topCustomers = Array.from(customerMap.values())
      .sort((a, b) => b.totalSpent - a.totalSpent)
      .slice(0, 5);

    // ─── Daily Breakdown ───────────────────────────────────
    const dailyMap = new Map<
      string,
      { date: string; sales: number; transactions: number }
    >();
    for (const sale of sales) {
      const key = sale.saleDate.toISOString().slice(0, 10);
      const existing = dailyMap.get(key) || {
        date: key,
        sales: 0,
        transactions: 0,
      };
      existing.sales += Number(sale.grandTotal);
      existing.transactions += 1;
      dailyMap.set(key, existing);
    }
    const daily = Array.from(dailyMap.values()).sort((a, b) =>
      a.date.localeCompare(b.date),
    );

    return {
      period: { from: from.toISOString(), to: to.toISOString() },
      scope: {
        businessId: scope.businessId,
        branchId: scope.branchId,
        branchIds: scope.branchIds,
      },
      totals: {
        totalSales,
        totalTransactions,
        totalItemsSold,
        averageOrderValue,
        totalExpenses,
        costOfGoodsSold,
        grossProfit,
        netProfit,
        totalInvoiced,
      },
      topProducts,
      topCustomers,
      daily,
    };
  }
  // ─── ACCESS HELPER (for stored reports) ────────────────
  private async assertReportAccess(reportBranchId: number, userId: number) {
    const scope = await this.resolveReportScope(userId);
    if (scope.branchIds && !scope.branchIds.includes(reportBranchId)) {
      throw new NotFoundException('Report not found');
    }
  }

  // ─── REPORT LOGS ──────────────────────────────────────
  async listReportLogs(userId: number) {
    await this.getUserContext(userId); // gate: must be at least authenticated+scoped
    return this.prisma.reportLog.findMany({
      orderBy: { generatedAt: 'desc' },
      include: { generator: { select: { userId: true, fullName: true } } },
    });
  }

  // ─── SCHEDULES ────────────────────────────────────────
  async createSchedule(dto: CreateReportScheduleDto, userId: number) {
    const scope = await this.resolveReportScope(userId, dto.branchId);
    if (!scope.branchId) {
      throw new BadRequestException(
        'A specific branchId is required when creating a schedule',
      );
    }

    return this.prisma.reportSchedule.create({
      data: {
        reportType: dto.reportType,
        frequency: dto.frequency,
        dailyTime: dto.dailyTime ?? '00:00',
        branchId: scope.branchId,
        emailRecipient: dto.emailRecipient,
        status: 'active',
      },
    });
  }

  async listSchedules(userId: number) {
    const scope = await this.resolveReportScope(userId);
    const where: any = {};
    if (scope.branchId) where.branchId = scope.branchId;
    else if (scope.branchIds) where.branchId = { in: scope.branchIds };

    return this.prisma.reportSchedule.findMany({
      where,
      include: { branch: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async deleteSchedule(id: number, userId: number) {
    const schedule = await this.prisma.reportSchedule.findUnique({
      where: { scheduleId: id },
    });
    if (!schedule) throw new NotFoundException('Schedule not found');

    const scope = await this.resolveReportScope(userId, schedule.branchId);
    if (!scope.branchId || scope.branchId !== schedule.branchId) {
      throw new NotFoundException('Schedule not found');
    }

    return this.prisma.reportSchedule.delete({ where: { scheduleId: id } });
  }
}