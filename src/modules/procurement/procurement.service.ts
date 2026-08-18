import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateRequisitionDto } from './dto/create-requisition.dto';
import { UpdateRequisitionDto } from './dto/update-requisition.dto';
import { CreatePurchaseOrderDto } from './dto/create-purchase-order.dto';
import { UpdatePurchaseOrderDto } from './dto/update-purchase-order.dto';
import { CreateGoodsReceiptDto } from './dto/create-goods-receipt.dto';
import {
  RequisitionStatus,
  OrderStatus,
  MovementType,
} from '@prisma/client';

@Injectable()
export class ProcurementService {
  constructor(private readonly prisma: PrismaService) {}

  // ─── REQUISITIONS ────────────────────────────────────
  async createRequisition(userId: number, dto: CreateRequisitionDto) {
    const branch = await this.prisma.branch.findUnique({ where: { branchId: dto.branchId } });
    if (!branch) throw new BadRequestException('Branch not found');

    const product = await this.prisma.product.findUnique({ where: { productId: dto.productId } });
    if (!product) throw new BadRequestException('Product not found');

    return this.prisma.purchaseRequisition.create({
      data: {
        branchId: dto.branchId,
        requestedBy: userId,
        productId: dto.productId,
        quantity: dto.quantity,
        reason: dto.reason,
        status: RequisitionStatus.DRAFT,
      },
      include: {
        branch: true,
        product: true,
        requester: { select: { userId: true, fullName: true, username: true } },
      },
    });
  }

  async listRequisitions(branchId?: number, status?: RequisitionStatus) {
    const where: any = {};
    if (branchId) where.branchId = branchId;
    if (status) where.status = status;
    return this.prisma.purchaseRequisition.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        branch: true,
        product: true,
        requester: { select: { userId: true, fullName: true, username: true } },
      },
    });
  }

  async getRequisition(id: number) {
    const req = await this.prisma.purchaseRequisition.findUnique({
      where: { requisitionId: id },
      include: {
        branch: true,
        product: true,
        requester: { select: { userId: true, fullName: true, username: true } },
      },
    });
    if (!req) throw new NotFoundException('Requisition not found');
    return req;
  }

  async updateRequisition(id: number, dto: UpdateRequisitionDto) {
    await this.getRequisition(id);
    return this.prisma.purchaseRequisition.update({
      where: { requisitionId: id },
      data: dto,
      include: {
        branch: true,
        product: true,
        requester: { select: { userId: true, fullName: true, username: true } },
      },
    });
  }

  async deleteRequisition(id: number) {
    await this.getRequisition(id);
    return this.prisma.purchaseRequisition.update({
      where: { requisitionId: id },
      data: { status: RequisitionStatus.REJECTED }, // soft-cancel via rejected status
    });
  }

  // ─── PURCHASE ORDERS ─────────────────────────────────
  async createPurchaseOrder(userId: number, dto: CreatePurchaseOrderDto) {
    const supplier = await this.prisma.supplier.findUnique({ where: { supplierId: dto.supplierId } });
    if (!supplier) throw new BadRequestException('Supplier not found');

    const branch = await this.prisma.branch.findUnique({ where: { branchId: dto.branchId } });
    if (!branch) throw new BadRequestException('Branch not found');

    const product = await this.prisma.product.findUnique({ where: { productId: dto.productId } });
    if (!product) throw new BadRequestException('Product not found');

    // If from requisition, update its status to ORDERED
    if (dto.requisitionId) {
      const req = await this.prisma.purchaseRequisition.findUnique({
        where: { requisitionId: dto.requisitionId },
      });
      if (!req) throw new BadRequestException('Requisition not found');
      if (req.status !== RequisitionStatus.APPROVED) {
        throw new BadRequestException('Requisition must be approved before ordering');
      }
      await this.prisma.purchaseRequisition.update({
        where: { requisitionId: dto.requisitionId },
        data: { status: RequisitionStatus.ORDERED },
      });
    }

    return this.prisma.purchaseOrder.create({
      data: {
        requisitionId: dto.requisitionId,
        supplierId: dto.supplierId,
        branchId: dto.branchId,
        productId: dto.productId,
        quantity: dto.quantity,
        expectedDate: dto.expectedDate ? new Date(dto.expectedDate) : null,
        notes: dto.notes,
        status: OrderStatus.PENDING,
        orderDate: new Date(),
      },
      include: {
        supplier: true,
        branch: true,
        product: true,
        requisition: true,
        receipts: true,
      },
    });
  }

  async listPurchaseOrders(branchId?: number, status?: OrderStatus) {
    const where: any = {};
    if (branchId) where.branchId = branchId;
    if (status) where.status = status;
    return this.prisma.purchaseOrder.findMany({
      where,
      orderBy: { orderDate: 'desc' },
      include: {
        supplier: true,
        branch: true,
        product: true,
        requisition: true,
        receipts: true,
      },
    });
  }

  async getPurchaseOrder(id: number) {
    const order = await this.prisma.purchaseOrder.findUnique({
      where: { orderId: id },
      include: {
        supplier: true,
        branch: true,
        product: true,
        requisition: true,
        receipts: true,
      },
    });
    if (!order) throw new NotFoundException('Purchase order not found');
    return order;
  }

  async updatePurchaseOrder(id: number, dto: UpdatePurchaseOrderDto) {
    await this.getPurchaseOrder(id);
    const data: any = { ...dto };
    if (dto.expectedDate) {
      data.expectedDate = new Date(dto.expectedDate);
    }
    return this.prisma.purchaseOrder.update({
      where: { orderId: id },
      data,
      include: {
        supplier: true,
        branch: true,
        product: true,
        requisition: true,
        receipts: true,
      },
    });
  }

  // ─── GOODS RECEIPTS ──────────────────────────────────
  async createGoodsReceipt(userId: number, dto: CreateGoodsReceiptDto) {
    return this.prisma.$transaction(async (tx) => {
      const order = await tx.purchaseOrder.findUnique({
        where: { orderId: dto.orderId },
        include: { receipts: true },
      });
      if (!order) throw new NotFoundException('Purchase order not found');
      if (order.productId !== dto.productId) {
        throw new BadRequestException('Product does not match the purchase order');
      }

      // Calculate already received quantity
      const alreadyReceived = order.receipts.reduce((sum, r) => sum + r.quantity, 0);
      const newTotalReceived = alreadyReceived + dto.quantity;
      if (newTotalReceived > order.quantity) {
        throw new BadRequestException(
          `Receipt quantity exceeds order quantity. Already received ${alreadyReceived}.`,
        );
      }

      // Create the receipt
      const receipt = await tx.goodsReceipt.create({
        data: {
          orderId: dto.orderId,
          productId: dto.productId,
          quantity: dto.quantity,
          receivedBy: userId,
          notes: dto.notes,
        },
      });

      // Update purchase order status
      let status: OrderStatus;
      if (newTotalReceived >= order.quantity) {
        status = OrderStatus.RECEIVED;
      } else if (newTotalReceived > 0) {
        status = OrderStatus.PARTIALLY_RECEIVED;
      } else {
        status = OrderStatus.PENDING;
      }
      await tx.purchaseOrder.update({
        where: { orderId: dto.orderId },
        data: { status },
      });

      // Update inventory
      const inventory = await tx.inventory.findUnique({
        where: {
          productId_branchId: {
            productId: dto.productId,
            branchId: order.branchId,
          },
        },
      });

      if (inventory) {
        const quantityBefore = inventory.quantity;
        const quantityAfter = quantityBefore + dto.quantity;
        await tx.inventory.update({
          where: { inventoryId: inventory.inventoryId },
          data: { quantity: quantityAfter },
        });
        await tx.inventoryMovement.create({
          data: {
            productId: dto.productId,
            branchId: order.branchId,
            movementType: MovementType.RECEIPT,
            quantityChange: dto.quantity,
            quantityBefore,
            quantityAfter,
            recordedBy: userId,
            referenceId: receipt.receiptId,
            referenceTable: 'GOODS_RECEIPTS',
            note: `Goods receipt for PO #${order.orderId}`,
          },
        });
      } else {
        await tx.inventory.create({
          data: {
            productId: dto.productId,
            branchId: order.branchId,
            quantity: dto.quantity,
          },
        });
        await tx.inventoryMovement.create({
          data: {
            productId: dto.productId,
            branchId: order.branchId,
            movementType: MovementType.RECEIPT,
            quantityChange: dto.quantity,
            quantityBefore: 0,
            quantityAfter: dto.quantity,
            recordedBy: userId,
            referenceId: receipt.receiptId,
            referenceTable: 'GOODS_RECEIPTS',
            note: `Goods receipt for PO #${order.orderId}`,
          },
        });
      }

      return tx.goodsReceipt.findUnique({
        where: { receiptId: receipt.receiptId },
        include: {
          order: {
            include: {
              supplier: true,
              branch: true,
              product: true,
            },
          },
          product: true,
          receiver: { select: { userId: true, fullName: true, username: true } },
        },
      });
    });
  }

  async listGoodsReceipts() {
    return this.prisma.goodsReceipt.findMany({
      orderBy: { receivedDate: 'desc' },
      include: {
        order: {
          include: { supplier: true, branch: true, product: true },
        },
        product: true,
        receiver: { select: { userId: true, fullName: true, username: true } },
      },
    });
  }

  async getGoodsReceipt(id: number) {
    const receipt = await this.prisma.goodsReceipt.findUnique({
      where: { receiptId: id },
      include: {
        order: {
          include: { supplier: true, branch: true, product: true },
        },
        product: true,
        receiver: { select: { userId: true, fullName: true, username: true } },
      },
    });
    if (!receipt) throw new NotFoundException('Goods receipt not found');
    return receipt;
  }
}