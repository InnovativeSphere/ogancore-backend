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

  /**
   * Create a complete sale with items and payments atomically.
   * Deducts inventory, logs movements, and generates an invoice number.
   */
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
      }> = [];

      let subtotal = 0;

      for (const item of dto.items) {
        const product = await tx.product.findUnique({
          where: { productId: item.productId },
        });

        if (!product) {
          throw new BadRequestException(`Product ${item.productId} not found`);
        }

        // Check product status
        if (product.status !== 'active') {
          throw new BadRequestException(
            `Product ${item.productId} is not active`,
          );
        }

        // Use provided unit price or fall back to product selling price
        const unitPrice =
          item.unitPrice !== undefined
            ? Number(item.unitPrice)
            : Number(product.sellingPrice);

        const totalPrice = unitPrice * item.quantity;
        subtotal += totalPrice;

        builtItems.push({
          productId: item.productId,
          quantity: item.quantity,
          unitPrice,
          totalPrice,
        });
      }

      // 5. Apply discount and tax
      const discount = dto.discount ? Number(dto.discount) : 0;
      const tax = dto.tax ? Number(dto.tax) : 0;
      const grandTotal = subtotal - discount + tax;

      // 6. Validate payments
      const totalPaid = dto.payments.reduce(
        (sum, p) => sum + Number(p.amount),
        0,
      );

      if (totalPaid < grandTotal && !dto.customerId) {
        throw new BadRequestException(
          'Customer is required for credit sales',
        );
      }

      if (totalPaid > grandTotal) {
        throw new BadRequestException(
          'Total payments cannot exceed grand total',
        );
      }

      // 7. Generate unique invoice number
      const invoiceNumber = `OGAN-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

      // 8. Create the sale
      const sale = await tx.sale.create({
        data: {
          invoiceNumber,
          customerId: dto.customerId ?? null,
          userId,
          branchId: dto.branchId,
          saleDate: new Date(),
          totalAmount: subtotal,
          discount,
          tax,
          grandTotal,
          status: 'completed',
        },
      });

      // 9. Create sale items and deduct inventory
      for (const item of builtItems) {
        // Get current inventory for this product at this branch
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

        // Update inventory
        await tx.inventory.update({
          where: { inventoryId: inventory.inventoryId },
          data: { quantity: quantityAfter },
        });

        // Create movement log
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
            note: `Sale ${invoiceNumber}`,
          },
        });

        // Create sale item
        await tx.saleItem.create({
          data: {
            saleId: sale.saleId,
            productId: item.productId,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            totalPrice: item.totalPrice,
          },
        });
      }

      // 10. Create payments
      const payments = [];
            // 10. Create payments
      for (const payment of dto.payments) {
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

      // 11. Create audit log
      await tx.auditLog.create({
        data: {
          userId,
          action: 'CREATE',
          tableName: 'SALES',
          recordId: sale.saleId,
          ipAddress: null,
        },
      });

      // 12. Return fully hydrated sale
      return tx.sale.findUnique({
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
    });
  }

  /**
   * List sales, optionally filtered by branch.
   */
  async findAll(branchId?: number) {
    const where: any = {};
    if (branchId) {
      where.branchId = branchId;
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
        items: true,
        payments: true,
      },
    });
  }

  /**
   * Get a single sale with full details.
   */
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
    if (!sale) throw new NotFoundException('Sale not found');
    return sale;
  }

  /**
   * Full refund — reverses inventory and marks sale as refunded.
   */
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

      // Reverse inventory for each item
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
          // If no inventory row, create one with the refunded quantity
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

      // Mark sale as refunded
      await tx.sale.update({
        where: { saleId: sale.saleId },
        data: { status: 'refunded' },
      });

      // Audit log
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
        include: {
          items: true,
          payments: true,
          branch: true,
          customer: true,
        },
      });
    });
  }
}