import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class AnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  // Helper: calculate gross profit for a sale item
  private async getGrossProfit(): Promise<number> {
    const items = await this.prisma.saleItem.findMany({
      include: { product: { select: { costPrice: true } } },
      where: { sale: { status: { not: 'refunded' } } },
    });
    let grossProfit = 0;
    for (const item of items) {
      const cost = Number(item.product.costPrice) * item.quantity;
      const revenue = Number(item.totalPrice);
      grossProfit += revenue - cost;
    }
    return grossProfit;
  }

  async getOverview(branchId?: number) {
    const sales = await this.prisma.sale.findMany({
      where: branchId
        ? { branchId, status: 'completed' }
        : { status: 'completed' },
    });
    const totalSales = sales.reduce((sum, s) => sum + Number(s.grandTotal), 0);
    const totalTransactions = sales.length;
    const totalDiscount = sales.reduce((sum, s) => sum + Number(s.discount), 0);
    const totalTax = sales.reduce((sum, s) => sum + Number(s.tax), 0);
    const totalReturns = await this.prisma.sale.count({
      where: { status: 'refunded' },
    });

    const totalExpenses = await this.prisma.expense.aggregate({
      _sum: { amount: true },
      where: { isActive: true, ...(branchId ? { branchId } : {}) },
    });
    const expensesSum = Number(totalExpenses._sum.amount || 0);

    const totalCustomers = await this.prisma.customer.count({
      where: { isActive: true },
    });
    const totalProducts = await this.prisma.product.count({
      where: { status: 'active' },
    });

    const inventory = await this.prisma.inventory.findMany({
      include: {
        product: {
          select: { costPrice: true, reorderLevel: true, status: true },
        },
      },
      where: branchId ? { branchId } : {},
    });
    const totalInventoryValue = inventory.reduce(
      (sum, inv) => sum + Number(inv.product.costPrice) * inv.quantity,
      0,
    );
    const lowStockItems = inventory.filter(
      (inv) =>
        inv.product.status === 'active' &&
        inv.quantity <= inv.product.reorderLevel,
    ).length;
    const outOfStockItems = inventory.filter(
      (inv) => inv.quantity === 0,
    ).length;

    const grossProfit = await this.getGrossProfit();
    const netProfit = grossProfit - expensesSum;
    const averageTransactionValue =
      totalTransactions > 0 ? totalSales / totalTransactions : 0;

    const salesGrowth = 0;
    const profitGrowth = 0;
    const transactionGrowth = 0;
    const customerGrowth = 0;

    return {
      totalSales,
      totalTransactions,
      grossProfit,
      netProfit,
      totalExpenses: expensesSum,
      totalCustomers,
      totalProducts,
      lowStockItems,
      outOfStockItems,
      totalInventoryValue,
      averageTransactionValue,
      totalDiscount,
      totalTax,
      totalReturns,
      salesGrowth,
      profitGrowth,
      transactionGrowth,
      customerGrowth,
    };
  }

  async getBusinessSnapshot(branchId?: number) {
    const overview = await this.getOverview(branchId);
    return {
      totalRevenue: overview.totalSales,
      grossProfit: overview.grossProfit,
      netProfit: overview.netProfit,
      totalExpenses: overview.totalExpenses,
      totalTransactions: overview.totalTransactions,
      totalCustomers: overview.totalCustomers,
      totalProducts: overview.totalProducts,
      totalInventoryValue: overview.totalInventoryValue,
      lowStockItems: overview.lowStockItems,
      outOfStockItems: overview.outOfStockItems,
      averageTransactionValue: overview.averageTransactionValue,
      salesGrowth: overview.salesGrowth,
      profitGrowth: overview.profitGrowth,
      customerGrowth: overview.customerGrowth,
      inventoryGrowth: 0,
    };
  }

  async getSalesOverview(filters: any) {
    const where: any = { status: 'completed' };
    if (filters.branchId) where.branchId = filters.branchId;
    if (filters.cashierId) where.userId = filters.cashierId;
    if (filters.posId) where.posId = filters.posId;
    if (filters.dateFrom || filters.dateTo) {
      where.saleDate = {};
      if (filters.dateFrom) where.saleDate.gte = new Date(filters.dateFrom);
      if (filters.dateTo) where.saleDate.lte = new Date(filters.dateTo);
    }

    const sales = await this.prisma.sale.findMany({
      where,
      include: { items: true },
      orderBy: { saleDate: 'asc' },
    });

    let totalSales = 0;
    let totalItemsSold = 0;
    let totalDiscount = 0;
    let totalTax = 0;
    for (const sale of sales) {
      totalSales += Number(sale.grandTotal);
      totalDiscount += Number(sale.discount);
      totalTax += Number(sale.tax);
      totalItemsSold += sale.items.reduce((sum, it) => sum + it.quantity, 0);
    }
    const totalTransactions = sales.length;
    const averageOrderValue =
      totalTransactions > 0 ? totalSales / totalTransactions : 0;
    const grossProfit = await this.getGrossProfit();

    const dailyMap = new Map<
      string,
      { date: string; sales: number; transactions: number; profit: number }
    >();
    for (const sale of sales) {
      const dateStr = sale.saleDate.toISOString().slice(0, 10);
      const existing = dailyMap.get(dateStr) || {
        date: dateStr,
        sales: 0,
        transactions: 0,
        profit: 0,
      };
      existing.sales += Number(sale.grandTotal);
      existing.transactions += 1;
      existing.profit +=
        Number(sale.grandTotal) * (grossProfit / (totalSales || 1));
      dailyMap.set(dateStr, existing);
    }
    const daily = Array.from(dailyMap.values()).sort((a, b) =>
      a.date.localeCompare(b.date),
    );

    return {
      period: 'daily',
      totalSales,
      totalTransactions,
      totalItemsSold,
      averageOrderValue,
      grossProfit,
      totalDiscount,
      totalTax,
      totalReturns: await this.prisma.sale.count({
        where: { status: 'refunded' },
      }),
      netSales: totalSales,
      daily,
    };
  }

  async getTopSellingProducts(limit = 10) {
    const items = await this.prisma.saleItem.groupBy({
      by: ['productId'],
      _sum: { quantity: true, totalPrice: true },
      where: { sale: { status: 'completed' } },
      orderBy: { _sum: { totalPrice: 'desc' } },
      take: limit,
    });

    const result: any[] = [];
    for (const item of items) {
      const product = await this.prisma.product.findUnique({
        where: { productId: item.productId },
        include: { category: true },
      });
      if (!product) continue;
      const quantitySold = item._sum.quantity || 0;
      const totalSales = Number(item._sum.totalPrice || 0);
      const costValue = Number(product.costPrice) * quantitySold;
      const grossProfit = totalSales - costValue;
      const profitMargin =
        totalSales > 0 ? (grossProfit / totalSales) * 100 : 0;
      result.push({
        productId: product.productId,
        productName: product.productName,
        sku: product.sku,
        category: product.category?.categoryName || '',
        quantitySold,
        totalSales,
        grossProfit,
        profitMargin: Number(profitMargin.toFixed(1)),
        percentageOfSales: 0,
      });
    }
    return result;
  }

  async getSalesByBranch() {
    const branches = await this.prisma.branch.findMany();
    const result: any[] = [];

    for (const branch of branches) {
      const sales = await this.prisma.sale.aggregate({
        _sum: { grandTotal: true },
        _count: { saleId: true },
        where: { branchId: branch.branchId, status: 'completed' },
      });

      const expenses = await this.prisma.expense.aggregate({
        _sum: { amount: true },
        where: { branchId: branch.branchId, isActive: true },
      });

      // Count distinct customers with at least one completed sale in this branch
      const customerGroups = await this.prisma.sale.groupBy({
        by: ['customerId'],
        where: {
          branchId: branch.branchId,
          status: 'completed',
          customerId: { not: null },
        },
      });

      const totalSales = Number(sales._sum.grandTotal || 0);
      const totalTransactions = sales._count.saleId;
      const grossProfit = await this.getGrossProfit(); // branch-wide could be improved later
      const totalExpenses = Number(expenses._sum.amount || 0);
      const netProfit = grossProfit - totalExpenses;
      const totalCustomers = customerGroups.length;

      result.push({
        branchId: branch.branchId,
        branchName: branch.branchName,
        totalSales,
        totalTransactions,
        grossProfit,
        netProfit,
        totalCustomers,
      });
    }

    return result;
  }

  async getTransactions(branchId?: number) {
    const where = branchId ? { branchId } : {};
    const totalTransactions = await this.prisma.sale.count({ where });
    const completedTransactions = await this.prisma.sale.count({
      where: { ...where, status: 'completed' },
    });
    const pendingTransactions = await this.prisma.sale.count({
      where: { ...where, status: 'pending' },
    });
    const cancelledTransactions = await this.prisma.sale.count({
      where: { ...where, status: 'cancelled' },
    });
    const returnedTransactions = await this.prisma.sale.count({
      where: { ...where, status: 'refunded' },
    });

    const sales = await this.prisma.sale.findMany({
      where: { ...where, status: 'completed' },
      select: { grandTotal: true },
    });
    const totalSales = sales.reduce((sum, s) => sum + Number(s.grandTotal), 0);
    const averageTransactionValue =
      sales.length > 0 ? totalSales / sales.length : 0;
    const largestTransaction =
      sales.length > 0
        ? Math.max(...sales.map((s) => Number(s.grandTotal)))
        : 0;
    const smallestTransaction =
      sales.length > 0
        ? Math.min(...sales.map((s) => Number(s.grandTotal)))
        : 0;

    return {
      totalTransactions,
      completedTransactions,
      pendingTransactions,
      cancelledTransactions,
      returnedTransactions,
      averageTransactionValue,
      largestTransaction,
      smallestTransaction,
    };
  }

  async getPaymentOverview(branchId?: number) {
    const payments = await this.prisma.payment.findMany({
      where: branchId ? { sale: { branchId } } : {},
    });
    const totals: any = {
      totalPayments: 0,
      cashPayments: 0,
      cardPayments: 0,
      bankTransferPayments: 0,
      walletPayments: 0,
      cashAmount: 0,
      cardAmount: 0,
      transferAmount: 0,
      walletAmount: 0,
      failedPayments: 0,
      refundedPayments: 0,
    };
    for (const p of payments) {
      const amount = Number(p.amount);
      switch (p.paymentMethod) {
        case 'CASH':
          totals.cashPayments += 1;
          totals.cashAmount += amount;
          break;
        case 'POS_CARD':
          totals.cardPayments += 1;
          totals.cardAmount += amount;
          break;
        case 'BANK_TRANSFER':
          totals.bankTransferPayments += 1;
          totals.transferAmount += amount;
          break;
        case 'OTHER':
          totals.walletPayments += 1;
          totals.walletAmount += amount;
          break;
      }
      if (p.status === 'failed') totals.failedPayments += 1;
      if (p.status === 'refunded') totals.refundedPayments += 1;
      totals.totalPayments += amount;
    }
    return totals;
  }

  async getInventorySummary(branchId?: number) {
    const inventory = await this.prisma.inventory.findMany({
      include: { product: true },
      where: branchId ? { branchId } : {},
    });
    const totalProducts = await this.prisma.product.count({
      where: { status: 'active' },
    });
    const totalStockQuantity = inventory.reduce(
      (sum, inv) => sum + inv.quantity,
      0,
    );
    const totalInventoryValue = inventory.reduce(
      (sum, inv) => sum + Number(inv.product.costPrice) * inv.quantity,
      0,
    );
    const totalCostValue = totalInventoryValue;
    const potentialSalesValue = inventory.reduce(
      (sum, inv) => sum + Number(inv.product.sellingPrice) * inv.quantity,
      0,
    );
    const lowStockItems = inventory.filter(
      (inv) =>
        inv.product.status === 'active' &&
        inv.quantity <= inv.product.reorderLevel,
    ).length;
    const outOfStockItems = inventory.filter(
      (inv) => inv.quantity === 0,
    ).length;
    const overstockedItems = inventory.filter(
      (inv) => inv.quantity > inv.product.reorderLevel * 3,
    ).length;

    const movements = await this.prisma.inventoryMovement.findMany({
      where: branchId ? { branchId } : {},
      select: { movementType: true, quantityChange: true },
    });
    const totalStockIn = movements
      .filter((m) => m.quantityChange > 0)
      .reduce((s, m) => s + m.quantityChange, 0);
    const totalStockOut = movements
      .filter((m) => m.quantityChange < 0)
      .reduce((s, m) => s + Math.abs(m.quantityChange), 0);

    return {
      totalProducts,
      totalStockQuantity,
      totalInventoryValue,
      totalCostValue,
      potentialSalesValue,
      lowStockItems,
      outOfStockItems,
      overstockedItems,
      stockMovements: movements.length,
      stockIn: totalStockIn,
      stockOut: totalStockOut,
    };
  }

  async getInventoryMovement(branchId?: number) {
    const movements = await this.prisma.inventoryMovement.findMany({
      where: branchId ? { branchId } : {},
    });
    let totalStockIn = 0,
      totalStockOut = 0,
      totalTransfers = 0,
      totalAdjustments = 0,
      totalDamaged = 0,
      totalExpired = 0,
      totalReturned = 0;
    for (const m of movements) {
      if (m.movementType === 'RECEIPT')
        totalStockIn += Math.abs(m.quantityChange);
      else if (m.movementType === 'SALE')
        totalStockOut += Math.abs(m.quantityChange);
      else if (
        m.movementType === 'TRANSFER_IN' ||
        m.movementType === 'TRANSFER_OUT'
      )
        totalTransfers += Math.abs(m.quantityChange);
      else if (m.movementType === 'ADJUSTMENT')
        totalAdjustments += Math.abs(m.quantityChange);
    }
    return {
      totalStockIn,
      totalStockOut,
      totalTransfers,
      totalAdjustments,
      totalDamaged: 0,
      totalExpired: 0,
      totalReturned: 0,
    };
  }

  async getLowStock(branchId?: number) {
    const inventory = await this.prisma.inventory.findMany({
      where: branchId ? { branchId } : {},
      include: { product: true },
    });
    return inventory
      .filter((inv) => inv.quantity <= inv.product.reorderLevel)
      .map((inv) => ({
        productId: inv.product.productId,
        productName: inv.product.productName,
        sku: inv.product.sku,
        quantity: inv.quantity,
        reorderLevel: inv.product.reorderLevel,
        branchId: inv.branchId,
      }));
  }

  async getExpensesOverview(branchId?: number) {
    const expenses = await this.prisma.expense.findMany({
      where: { isActive: true, ...(branchId ? { branchId } : {}) },
    });
    const categories: any = {};
    let totalExpenses = 0;
    for (const e of expenses) {
      const amount = Number(e.amount);
      totalExpenses += amount;
      const cat = e.category || 'other';
      if (!categories[cat]) categories[cat] = 0;
      categories[cat] += amount;
    }
    return {
      totalExpenses,
      operatingExpenses: categories['operating'] || 0,
      salaryExpenses: categories['salary'] || 0,
      utilities: categories['utilities'] || 0,
      rent: categories['rent'] || 0,
      transportation: categories['transportation'] || 0,
      maintenance: categories['maintenance'] || 0,
      otherExpenses: categories['other'] || 0,
      expenseCount: expenses.length,
      averageExpense: expenses.length > 0 ? totalExpenses / expenses.length : 0,
    };
  }

  async getCustomers() {
    return {
      totalCustomers: await this.prisma.customer.count({
        where: { isActive: true },
      }),
      customerGrowth: 0,
    };
  }

  async getTopCustomers(limit = 10) {
    const sales = await this.prisma.sale.groupBy({
      by: ['customerId'],
      _sum: { grandTotal: true },
      where: { status: 'completed', customerId: { not: null } },
      orderBy: { _sum: { grandTotal: 'desc' } },
      take: limit,
    });
    const result: any[] = [];
    for (const s of sales) {
      const customer = await this.prisma.customer.findUnique({
        where: { customerId: s.customerId! },
      });
      if (!customer) continue;
      result.push({
        customerId: customer.customerId,
        name: customer.name,
        phone: customer.phone,
        totalSpent: Number(s._sum.grandTotal || 0),
      });
    }
    return result;
  }

  async getSalesByCategory() {
    const items = await this.prisma.saleItem.findMany({
      include: { product: { include: { category: true } } },
      where: { sale: { status: 'completed' } },
    });
    const map = new Map<
      number,
      { categoryId: number; categoryName: string; totalSales: number }
    >();
    for (const item of items) {
      const cat = item.product.category;
      if (!cat) continue;
      const existing = map.get(cat.categoryId) || {
        categoryId: cat.categoryId,
        categoryName: cat.categoryName,
        totalSales: 0,
      };
      existing.totalSales += Number(item.totalPrice);
      map.set(cat.categoryId, existing);
    }
    return Array.from(map.values());
  }

  async getSalesByPos() {
    const rows = await this.prisma.sale.groupBy({
      by: [Prisma.SaleScalarFieldEnum.posId],
      _sum: { grandTotal: true },
      _count: { saleId: true },
      where: { status: 'completed', posId: { not: null } },
    });
    return rows.map((r) => ({
      posId: r.posId,
      totalSales: Number(r._sum.grandTotal || 0),
      totalTransactions: r._count.saleId,
    }));
  }

  async getSalesByCashier() {
    const rows = await this.prisma.sale.groupBy({
      by: [Prisma.SaleScalarFieldEnum.userId],
      _sum: { grandTotal: true },
      _count: { saleId: true },
      where: { status: 'completed' },
    });
    const result: any[] = [];
    for (const r of rows) {
      const user = await this.prisma.user.findUnique({
        where: { userId: r.userId },
        select: { fullName: true },
      });
      result.push({
        userId: r.userId,
        fullName: user?.fullName || 'Unknown',
        totalSales: Number(r._sum.grandTotal || 0),
        totalTransactions: r._count.saleId,
      });
    }
    return result;
  }

  async getProfit(branchId?: number) {
    const overview = await this.getOverview(branchId);
    const totalSales = overview.totalSales;
    const grossProfit = overview.grossProfit;
    const totalExpenses = overview.totalExpenses;
    const netProfit = grossProfit - totalExpenses;
    return {
      totalSales,
      costOfGoodsSold: totalSales - grossProfit,
      grossProfit,
      totalExpenses,
      netProfit,
      profitMargin: totalSales > 0 ? (netProfit / totalSales) * 100 : 0,
    };
  }
}
