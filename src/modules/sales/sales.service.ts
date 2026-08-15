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
import { MovementType, PaymentMethod } from '@prisma/client';

@Injectable()
export class SalesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: number, dto: CreateSaleDto) {
    return this.prisma.$transaction(async (tx) => {
      // 1. Validate branch
      const branch = await tx.branch.findUnique({
        where: { branchId: dto.branchId },
      });
      if (!branch) throw new BadRequestException('Branch not found');

      // 2. Validate customer if provided
      if (dto.customerId) {
        const customer = await tx.customer.findUnique({
          where: { customerId: dto.customerId },
        });
        if (!customer) throw new BadRequestException('Customer not found');
      }

      // 3. Validate items exist
      if (!dto.items || dto.items.length === 0) {
        throw new BadRequestException('Sale must contain at least one item');
      }

      // 4. Build line items and calculate totals
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
          throw new BadRequestException(`Product ${item.productId} is not active`);
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

      // 5. Calculate grand total
      const grandTotal = subtotal - totalDiscount + totalTax;

      // 6. Build payments
      const paymentsToCreate: CreatePaymentEntryDto[] = dto.payments && dto.payments.length > 0
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

      // 7. Validate credit sale
      if (totalPaid < grandTotal && !dto.customerId) {
        throw new BadRequestException('Customer is required for credit sales');
      }

      const change = totalPaid > grandTotal ? totalPaid - grandTotal : 0;

      // 8. Generate transaction number
      const transactionNumber = `OGAN-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

      // 9. Create sale
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
          notes: dto.notes,
          status: 'completed',
        },
      });

      // 10. Create sale items and deduct inventory
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

      // 11. Create payments
      for (const payment of paymentsToCreate) {
        await tx.payment.create({
          data: {
            saleId: sale.saleId,
            paymentMethod: payment.paymentMethod,
            amount: Number(payment.amount),
            paymentDate: new Date(),
            referenceNumber: payment.referenceNumber,
            status: 'completed',
          },
        });
      }

      // 12. Audit log
      await tx.auditLog.create({
        data: {
          userId,
          action: 'CREATE',
          tableName: 'SALES',
          recordId: sale.saleId,
          ipAddress: null,
        },
      });

      // 13. Return fully hydrated sale with computed fields
      const fullSale = await tx.sale.findUnique({
        where: { saleId: sale.saleId },
        include: {
          branch: true,
          customer: true,
          cashier: {
            select: { userId: true, fullName: true, username: true },
          },
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

      return {
        ...fullSale,
        transactionNumber,
        subtotal,
        totalDiscount,
        totalTax,
        amountPaid: totalPaid,
        change,
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
    search?: string;
  }) {
    const where: any = {};

    if (filters?.branchId) where.branchId = filters.branchId;
    if (filters?.cashierId) where.userId = filters.cashierId;
    if (filters?.posId) where.posId = filters.posId;
    if (filters?.status) where.status = filters.status;

    if (filters?.dateFrom || filters?.dateTo) {
      where.saleDate = {};
      if (filters.dateFrom) where.saleDate.gte = new Date(filters.dateFrom);
      if (filters.dateTo) where.saleDate.lte = new Date(filters.dateTo);
    }

    if (filters?.search) {
      where.OR = [
        { invoiceNumber: { contains: filters.search } },
        { notes: { contains: filters.search } },
        { customer: { name: { contains: filters.search } } },
      ];
    }

    if (filters?.paymentMethod) {
      where.payments = { some: { paymentMethod: filters.paymentMethod } };
    }

    return this.prisma.sale.findMany({
      where,
      orderBy: { saleDate: 'desc' },
      include: {
        branch: true,
        customer: true,
        cashier: {
          select: { userId: true, fullName: true, username: true },
        },
        items: {
          include: {
            product: {
              select: { productId: true, productName: true, sku: true, barcode: true },
            },
          },
        },
        payments: true,
      },
    });
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
        cashier: {
          select: { userId: true, fullName: true, username: true },
        },
        items: {
          include: {
            product: {
              select: { productId: true, productName: true, sku: true, barcode: true },
            },
          },
        },
        payments: true,
      },
    });
    if (!sale) throw new NotFoundException('Sale not found');
    return sale;
  }

  async refund(id: number, userId: number, dto: RefundSaleDto) {
    return this.prisma.$transaction(async (tx) => {
      const sale = await tx.sale.findUnique({
        where: { saleId: id },
        include: { items: true },
      });
      if (!sale) throw new NotFoundException('Sale not found');
      if (sale.status === 'refunded') {
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
        data: { status: 'refunded' },
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