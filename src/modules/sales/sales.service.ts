import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  CreateSaleDto,
  CreateSaleItemDto,
  CreatePaymentEntryDto,
} from './dto/create-sale.dto';
import { RefundSaleDto } from './dto/refund-sale.dto';
import {
  MovementType,
  PaymentMethod,
  SaleStatus,
  PaymentStatus,
} from '@prisma/client';

@Injectable()
export class SalesService {
  constructor(private readonly prisma: PrismaService) {}

  private computePaymentStatus(
    grandTotal: number,
    totalPaid: number,
  ): PaymentStatus {
    if (totalPaid >= grandTotal) return PaymentStatus.PAID;
    if (totalPaid > 0) return PaymentStatus.PARTIALLY_PAID;
    return PaymentStatus.UNPAID;
  }

  async create(userId: number, dto: CreateSaleDto) {
    return this.prisma.$transaction(async (tx) => {
      const branch = await tx.branch.findUnique({
        where: { branchId: dto.branchId },
      });
      if (!branch) throw new BadRequestException('Branch not found');

      if (dto.customerId) {
        const customer = await tx.customer.findUnique({
          where: { customerId: dto.customerId },
        });
        if (!customer) throw new BadRequestException('Customer not found');
      }

      if (!dto.items || dto.items.length === 0) {
        throw new BadRequestException('Sale must contain at least one item');
      }

      // Build items and calculate totals
      const builtItems: Array<{
        productId: number;
        quantity: number;
        unitPrice: number;
        totalPrice: number;
        discount: number;
        tax: number;
      }> = [];

      let subtotal = 0;
      let totalDiscount = 0;
      let totalTax = 0;

      for (const item of dto.items) {
        const product = await tx.product.findUnique({
          where: { productId: item.productId },
        });
        if (!product) {
          throw new BadRequestException(`Product ${item.productId} not found`);
        }
        if (product.status !== 'active') {
          throw new BadRequestException(
            `Product ${item.productId} is not active`,
          );
        }

        const unitPrice =
          item.unitPrice !== undefined
            ? Number(item.unitPrice)
            : Number(product.sellingPrice);
        const quantity = item.quantity;
        const lineTotal = unitPrice * quantity;
        const lineDiscount = item.discount ? Number(item.discount) : 0;
        const lineTax = item.tax ? Number(item.tax) : 0;

        subtotal += lineTotal;
        totalDiscount += lineDiscount;
        totalTax += lineTax;

        builtItems.push({
          productId: item.productId,
          quantity,
          unitPrice,
          totalPrice: lineTotal,
          discount: lineDiscount,
          tax: lineTax,
        });
      }

      const grandTotal = subtotal - totalDiscount + totalTax;

      // Build payments
      const paymentsToCreate: CreatePaymentEntryDto[] =
        dto.payments && dto.payments.length > 0
          ? dto.payments
          : dto.paymentMethod
            ? [{ paymentMethod: dto.paymentMethod, amount: grandTotal }]
            : [];

      if (paymentsToCreate.length === 0) {
        throw new BadRequestException('Payment information is required');
      }

      const totalPaid = paymentsToCreate.reduce(
        (sum, p) => sum + Number(p.amount),
        0,
      );

      if (totalPaid < grandTotal && !dto.customerId) {
        throw new BadRequestException('Customer is required for credit sales');
      }

      const change = totalPaid > grandTotal ? totalPaid - grandTotal : 0;

      // Determine sale status based on payment
      let saleStatus: SaleStatus = SaleStatus.COMPLETED;
      if (totalPaid < grandTotal && totalPaid > 0) {
        saleStatus = SaleStatus.PENDING;
      } else if (totalPaid === 0) {
        saleStatus = SaleStatus.PENDING; // or DRAFT? We'll use PENDING for unpaid credit sale
      }

      const transactionNumber = `TXN-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

      const sale = await tx.sale.create({
        data: {
          invoiceNumber: transactionNumber,
          customerId: dto.customerId ?? null,
          userId,
          branchId: dto.branchId,
          saleDate: new Date(),
          totalAmount: subtotal,
          discount: totalDiscount,
          tax: totalTax,
          grandTotal,
          posId: dto.posId,
          sessionId: dto.sessionId,
          notes: dto.notes,
          status: saleStatus,
        },
      });

      // Create sale items and deduct inventory
      for (const item of builtItems) {
        const inventory = await tx.inventory.findUnique({
          where: {
            productId_branchId: {
              productId: item.productId,
              branchId: dto.branchId,
            },
          },
        });

        if (!inventory || inventory.quantity < item.quantity) {
          throw new BadRequestException(
            `Insufficient stock for product ${item.productId}`,
          );
        }

        const quantityBefore = inventory.quantity;
        const quantityAfter = quantityBefore - item.quantity;

        await tx.inventory.update({
          where: { inventoryId: inventory.inventoryId },
          data: { quantity: quantityAfter },
        });

        await tx.inventoryMovement.create({
          data: {
            productId: item.productId,
            branchId: dto.branchId,
            movementType: MovementType.SALE,
            quantityChange: -item.quantity,
            quantityBefore,
            quantityAfter,
            recordedBy: userId,
            referenceId: sale.saleId,
            referenceTable: 'SALES',
            note: `Sale ${transactionNumber}`,
          },
        });

        await tx.saleItem.create({
          data: {
            saleId: sale.saleId,
            productId: item.productId,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            totalPrice: item.totalPrice,
            discount: item.discount,
            tax: item.tax,
          },
        });
      }

      // Create payments
      const createdPayments: any[] = [];
      for (const payment of paymentsToCreate) {
        const created = await tx.payment.create({
          data: {
            saleId: sale.saleId,
            paymentMethod: payment.paymentMethod,
            amount: Number(payment.amount),
            paymentDate: new Date(),
            referenceNumber: payment.referenceNumber,
            status: PaymentStatus.PAID,
            currency: 'NGN',
          },
        });
        createdPayments.push(created);
      }

      await tx.auditLog.create({
        data: {
          userId,
          action: 'CREATE',
          tableName: 'SALES',
          recordId: sale.saleId,
          ipAddress: null,
        },
      });

      const fullSale = await tx.sale.findUnique({
        where: { saleId: sale.saleId },
        include: {
          branch: true,
          customer: true,
          cashier: { select: { userId: true, fullName: true, username: true } },
          items: {
            include: {
              product: {
                select: {
                  productId: true,
                  productName: true,
                  sku: true,
                  barcode: true,
                },
              },
            },
          },
          payments: true,
        },
      });

      const paymentStatus = this.computePaymentStatus(grandTotal, totalPaid);

      return {
        sale: {
          id: fullSale!.saleId,
          transactionNumber,
          branchId: fullSale!.branchId,
          posId: fullSale!.posId,
          sessionId: fullSale!.sessionId,
          cashierId: fullSale!.userId,
          customerId: fullSale!.customerId,
          subtotal,
          discount: totalDiscount,
          tax: totalTax,
          total: grandTotal,
          amountPaid: totalPaid,
          change,
          paymentStatus,
          saleStatus: fullSale!.status,
          createdAt: fullSale!.saleDate,
        },
        items: fullSale!.items.map((item) => ({
          productId: item.productId,
          productName: item.product.productName,
          sku: item.product.sku,
          quantity: item.quantity,
          unitPrice: Number(item.unitPrice),
          discount: Number(item.discount),
          total: Number(item.totalPrice),
        })),
        payment: createdPayments[0]
          ? {
              id: createdPayments[0].paymentId,
              reference: createdPayments[0].referenceNumber,
              method: createdPayments[0].paymentMethod,
              amount: Number(createdPayments[0].amount),
              change,
              status: createdPayments[0].status,
            }
          : null,
        stats: {
          transactionTotal: grandTotal,
          grossProfit: 0, // we could compute later if needed
          itemsSold: builtItems.reduce((sum, i) => sum + i.quantity, 0),
          totalSalesToday: 0,
          totalTransactionsToday: 0,
          averageTransactionValue: 0,
        },
      };
    });
  }

  async findAll(filters?: {
    branchId?: number;
    dateFrom?: string;
    dateTo?: string;
    cashierId?: number;
    posId?: string;
    paymentMethod?: PaymentMethod;
    status?: string;
    paymentStatus?: string;
    search?: string;
    page?: number;
    limit?: number;
  }) {
    const where: any = {};
    if (filters?.branchId) where.branchId = filters.branchId;
    if (filters?.cashierId) where.userId = filters.cashierId;
    if (filters?.posId) where.posId = filters.posId;
    if (filters?.status) where.status = filters.status;
    if (filters?.search) {
      where.OR = [
        { invoiceNumber: { contains: filters.search } },
        { notes: { contains: filters.search } },
        { customer: { name: { contains: filters.search } } },
      ];
    }
    if (filters?.dateFrom || filters?.dateTo) {
      where.saleDate = {};
      if (filters.dateFrom) where.saleDate.gte = new Date(filters.dateFrom);
      if (filters.dateTo) where.saleDate.lte = new Date(filters.dateTo);
    }
    if (filters?.paymentMethod) {
      where.payments = { some: { paymentMethod: filters.paymentMethod } };
    }

    const sales = await this.prisma.sale.findMany({
      where,
      include: {
        customer: true,
        payments: true,
        items: {
          include: {
            product: {
              select: {
                productId: true,
                productName: true,
                sku: true,
                barcode: true,
              },
            },
          },
        },
        cashier: { select: { userId: true, fullName: true, username: true } },
        branch: true,
      },
      orderBy: { saleDate: 'desc' },
    });

    // Filter by paymentStatus after fetching
    let filteredSales = sales;
    if (filters?.paymentStatus) {
      filteredSales = sales.filter((sale) => {
        const totalPaid = sale.payments.reduce(
          (sum, p) => sum + Number(p.amount),
          0,
        );
        const status = this.computePaymentStatus(
          Number(sale.grandTotal),
          totalPaid,
        );
        return status === filters.paymentStatus;
      });
    }

    // Pagination
    const page = filters?.page || 1;
    const limit = filters?.limit || 20;
    const total = filteredSales.length;
    const totalPages = Math.ceil(total / limit);
    const start = (page - 1) * limit;
    const paginatedSales = filteredSales.slice(start, start + limit);

    const transactions = paginatedSales.map((sale) => {
      const totalPaid = sale.payments.reduce(
        (sum, p) => sum + Number(p.amount),
        0,
      );
      const outstandingAmount = Number(sale.grandTotal) - totalPaid;
      const paymentStatus = this.computePaymentStatus(
        Number(sale.grandTotal),
        totalPaid,
      );
      return {
        id: sale.saleId,
        transactionNumber: sale.invoiceNumber,
        branchId: sale.branchId,
        posId: sale.posId,
        sessionId: sale.sessionId,
        cashier: sale.cashier,
        customer: sale.customer
          ? {
              id: sale.customer.customerId,
              name: sale.customer.name,
              phone: sale.customer.phone,
            }
          : null,
        items: sale.items.map((item) => ({
          productId: item.productId,
          productName: item.product?.productName ?? '',
          sku: item.product?.sku ?? '',
          quantity: item.quantity,
          unitPrice: Number(item.unitPrice),
          discount: Number(item.discount),
          tax: Number(item.tax),
          total: Number(item.totalPrice),
        })),
        subtotal: Number(sale.totalAmount),
        discount: Number(sale.discount),
        tax: Number(sale.tax),
        total: Number(sale.grandTotal),
        amountPaid: totalPaid,
        outstandingAmount,
        paymentStatus,
        saleStatus: sale.status,
        createdAt: sale.saleDate,
      };
    });

    const allSales = sales; // for stats
    const totalSales = allSales.reduce(
      (sum, s) => sum + Number(s.grandTotal),
      0,
    );
    const grossProfit = 0; // simplified, compute later
    const totalItemsSold = allSales.reduce(
      (sum, s) => sum + s.items.reduce((is, it) => is + it.quantity, 0),
      0,
    );
    const averageTransactionValue =
      allSales.length > 0 ? totalSales / allSales.length : 0;

    return {
      transactions,
      stats: {
        totalSales,
        totalTransactions: allSales.length,
        grossProfit,
        totalItemsSold,
        averageTransactionValue,
        totalDiscount: allSales.reduce((sum, s) => sum + Number(s.discount), 0),
      },
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
    };
  }

  async search(q: string) {
    return this.findAll({ search: q });
  }

  async findOne(id: number) {
    const sale = await this.prisma.sale.findUnique({
      where: { saleId: id },
      include: {
        branch: true,
        customer: true,
        cashier: { select: { userId: true, fullName: true, username: true } },
        items: { include: { product: true } },
        payments: true,
      },
    });
    if (!sale) throw new NotFoundException('Sale not found');
    const totalPaid = sale.payments.reduce(
      (sum, p) => sum + Number(p.amount),
      0,
    );
    const outstandingAmount = Number(sale.grandTotal) - totalPaid;
    const paymentStatus = this.computePaymentStatus(
      Number(sale.grandTotal),
      totalPaid,
    );
    return {
      sale: {
        id: sale.saleId,
        transactionNumber: sale.invoiceNumber,
        branchId: sale.branchId,
        posId: sale.posId,
        sessionId: sale.sessionId,
        cashierId: sale.userId,
        customerId: sale.customerId,
        subtotal: Number(sale.totalAmount),
        discount: Number(sale.discount),
        tax: Number(sale.tax),
        total: Number(sale.grandTotal),
        amountPaid: totalPaid,
        outstandingAmount,
        paymentStatus,
        saleStatus: sale.status,
        createdAt: sale.saleDate,
      },
      items: sale.items.map((item) => ({
        productId: item.productId,
        productName: item.product.productName,
        sku: item.product.sku,
        quantity: item.quantity,
        unitPrice: Number(item.unitPrice),
        discount: Number(item.discount),
        tax: Number(item.tax),
        total: Number(item.totalPrice),
      })),
      payments: sale.payments.map((p) => ({
        id: p.paymentId,
        reference: p.referenceNumber,
        method: p.paymentMethod,
        amount: Number(p.amount),
        currency: p.currency,
        status: p.status,
        paidAt: p.paymentDate,
      })),
    };
  }

  async refund(id: number, userId: number, dto: RefundSaleDto) {
    return this.prisma.$transaction(async (tx) => {
      const sale = await tx.sale.findUnique({
        where: { saleId: id },
        include: { items: true },
      });
      if (!sale) throw new NotFoundException('Sale not found');
      if (sale.status === SaleStatus.RETURNED) {
        throw new BadRequestException('Sale already refunded');
      }

      for (const item of sale.items) {
        const inventory = await tx.inventory.findUnique({
          where: {
            productId_branchId: {
              productId: item.productId,
              branchId: sale.branchId,
            },
          },
        });

        if (!inventory) {
          await tx.inventory.create({
            data: {
              productId: item.productId,
              branchId: sale.branchId,
              quantity: item.quantity,
            },
          });
          await tx.inventoryMovement.create({
            data: {
              productId: item.productId,
              branchId: sale.branchId,
              movementType: MovementType.ADJUSTMENT,
              quantityChange: item.quantity,
              quantityBefore: 0,
              quantityAfter: item.quantity,
              recordedBy: userId,
              referenceId: sale.saleId,
              referenceTable: 'SALES',
              note: `Refund: ${dto.reason || 'No reason provided'}`,
            },
          });
        } else {
          const quantityBefore = inventory.quantity;
          const quantityAfter = quantityBefore + item.quantity;
          await tx.inventory.update({
            where: { inventoryId: inventory.inventoryId },
            data: { quantity: quantityAfter },
          });
          await tx.inventoryMovement.create({
            data: {
              productId: item.productId,
              branchId: sale.branchId,
              movementType: MovementType.ADJUSTMENT,
              quantityChange: item.quantity,
              quantityBefore,
              quantityAfter,
              recordedBy: userId,
              referenceId: sale.saleId,
              referenceTable: 'SALES',
              note: `Refund: ${dto.reason || 'No reason provided'}`,
            },
          });
        }
      }

      await tx.sale.update({
        where: { saleId: sale.saleId },
        data: { status: SaleStatus.RETURNED },
      });

      await tx.auditLog.create({
        data: {
          userId,
          action: 'REFUND',
          tableName: 'SALES',
          recordId: sale.saleId,
          ipAddress: null,
        },
      });

      return tx.sale.findUnique({
        where: { saleId: sale.saleId },
        include: { items: true, payments: true, branch: true, customer: true },
      });
    });
  }
}
