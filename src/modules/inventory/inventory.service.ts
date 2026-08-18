import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { StockInDto } from './dto/stock-in.dto';
import { StockOutDto } from './dto/stock-out.dto';
import { TransferDto } from './dto/transfer.dto';
import { AdjustDto } from './dto/adjust.dto';
import { MovementType, NotificationType } from '@prisma/client';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class InventoryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
  ) {}

  private async checkAndNotifyStock(productId: number, branchId: number) {
    const inventory = await this.prisma.inventory.findUnique({
      where: { productId_branchId: { productId, branchId } },
      include: { product: true },
    });
    if (!inventory) return;

    if (inventory.quantity === 0) {
      await this.notificationsService.createForAdmins(
        branchId,
        NotificationType.OUT_OF_STOCK,
        `Out of stock: ${inventory.product.productName}`,
        `${inventory.product.productName} has run out of stock.`,
      );
    } else if (inventory.quantity <= inventory.product.reorderLevel) {
      await this.notificationsService.createForAdmins(
        branchId,
        NotificationType.LOW_STOCK,
        `Low stock: ${inventory.product.productName}`,
        `${inventory.product.productName} is below the reorder level (${inventory.product.reorderLevel}).`,
      );
    }
  }

  async viewBranchInventory(branchId: number) {
    const branch = await this.prisma.branch.findUnique({ where: { branchId } });
    if (!branch) throw new NotFoundException('Branch not found');

    return this.prisma.inventory.findMany({
      where: { branchId },
      include: { product: true },
    });
  }

  async stockIn(userId: number, dto: StockInDto) {
    return this.prisma.$transaction(async (tx) => {
      const product = await tx.product.findUnique({ where: { productId: dto.productId } });
      if (!product) throw new BadRequestException('Product not found');

      const branch = await tx.branch.findUnique({ where: { branchId: dto.branchId } });
      if (!branch) throw new BadRequestException('Branch not found');

      const existing = await tx.inventory.findUnique({
        where: { productId_branchId: { productId: dto.productId, branchId: dto.branchId } },
      });
      const quantityBefore = existing ? existing.quantity : 0;
      const quantityAfter = quantityBefore + dto.quantity;

      const inventory = await tx.inventory.upsert({
        where: { productId_branchId: { productId: dto.productId, branchId: dto.branchId } },
        create: {
          productId: dto.productId,
          branchId: dto.branchId,
          quantity: quantityAfter,
        },
        update: { quantity: quantityAfter },
      });

      await tx.inventoryMovement.create({
        data: {
          productId: dto.productId,
          branchId: dto.branchId,
          movementType: MovementType.RECEIPT,
          quantityChange: dto.quantity,
          quantityBefore,
          quantityAfter,
          recordedBy: userId,
          note: dto.note,
        },
      });

      return inventory;
    });
  }

  async stockOut(userId: number, dto: StockOutDto) {
    return this.prisma.$transaction(async (tx) => {
      const product = await tx.product.findUnique({ where: { productId: dto.productId } });
      if (!product) throw new BadRequestException('Product not found');

      const branch = await tx.branch.findUnique({ where: { branchId: dto.branchId } });
      if (!branch) throw new BadRequestException('Branch not found');

      const existing = await tx.inventory.findUnique({
        where: { productId_branchId: { productId: dto.productId, branchId: dto.branchId } },
      });
      const quantityBefore = existing ? existing.quantity : 0;
      const quantityAfter = quantityBefore - dto.quantity;

      if (quantityAfter < 0) {
        throw new BadRequestException('Insufficient stock for this operation');
      }

      if (!existing) throw new NotFoundException('Inventory not found');

      const inventory = await tx.inventory.update({
        where: { inventoryId: existing.inventoryId },
        data: { quantity: quantityAfter },
      });

      await tx.inventoryMovement.create({
        data: {
          productId: dto.productId,
          branchId: dto.branchId,
          movementType: MovementType.ADJUSTMENT,
          quantityChange: -dto.quantity,
          quantityBefore,
          quantityAfter,
          recordedBy: userId,
          note: dto.note,
        },
      });

      return inventory;
    }).then(async (inventory) => {
      await this.checkAndNotifyStock(dto.productId, dto.branchId);
      return inventory;
    });
  }

  async transfer(userId: number, dto: TransferDto) {
    return this.prisma.$transaction(async (tx) => {
      if (dto.fromBranchId === dto.toBranchId) {
        throw new BadRequestException('Source and destination branches must differ');
      }

      const product = await tx.product.findUnique({ where: { productId: dto.productId } });
      if (!product) throw new BadRequestException('Product not found');

      const fromBranch = await tx.branch.findUnique({ where: { branchId: dto.fromBranchId } });
      if (!fromBranch) throw new BadRequestException('Source branch not found');

      const toBranch = await tx.branch.findUnique({ where: { branchId: dto.toBranchId } });
      if (!toBranch) throw new BadRequestException('Destination branch not found');

      const sourceInv = await tx.inventory.findUnique({
        where: { productId_branchId: { productId: dto.productId, branchId: dto.fromBranchId } },
      });
      if (!sourceInv || sourceInv.quantity < dto.quantity) {
        throw new BadRequestException('Insufficient stock at source branch');
      }
      const sourceBefore = sourceInv.quantity;
      const sourceAfter = sourceBefore - dto.quantity;

      const destInv = await tx.inventory.findUnique({
        where: { productId_branchId: { productId: dto.productId, branchId: dto.toBranchId } },
      });
      const destBefore = destInv ? destInv.quantity : 0;
      const destAfter = destBefore + dto.quantity;

      await tx.inventory.update({
        where: { inventoryId: sourceInv.inventoryId },
        data: { quantity: sourceAfter },
      });

      await tx.inventory.upsert({
        where: { productId_branchId: { productId: dto.productId, branchId: dto.toBranchId } },
        create: {
          productId: dto.productId,
          branchId: dto.toBranchId,
          quantity: destAfter,
        },
        update: { quantity: destAfter },
      });

      await tx.inventoryMovement.create({
        data: {
          productId: dto.productId,
          branchId: dto.fromBranchId,
          movementType: MovementType.TRANSFER_OUT,
          quantityChange: -dto.quantity,
          quantityBefore: sourceBefore,
          quantityAfter: sourceAfter,
          recordedBy: userId,
          note: dto.note || `Transferred to branch ${dto.toBranchId}`,
        },
      });

      await tx.inventoryMovement.create({
        data: {
          productId: dto.productId,
          branchId: dto.toBranchId,
          movementType: MovementType.TRANSFER_IN,
          quantityChange: dto.quantity,
          quantityBefore: destBefore,
          quantityAfter: destAfter,
          recordedBy: userId,
          note: dto.note || `Received from branch ${dto.fromBranchId}`,
        },
      });

      return { message: 'Transfer completed successfully' };
    }).then(async (res) => {
      await this.checkAndNotifyStock(dto.productId, dto.fromBranchId);
      return res;
    });
  }

  async adjust(userId: number, dto: AdjustDto) {
    return this.prisma.$transaction(async (tx) => {
      const product = await tx.product.findUnique({ where: { productId: dto.productId } });
      if (!product) throw new BadRequestException('Product not found');

      const branch = await tx.branch.findUnique({ where: { branchId: dto.branchId } });
      if (!branch) throw new BadRequestException('Branch not found');

      const existing = await tx.inventory.findUnique({
        where: { productId_branchId: { productId: dto.productId, branchId: dto.branchId } },
      });
      const quantityBefore = existing ? existing.quantity : 0;
      const quantityAfter = quantityBefore + dto.quantityChange;

      if (quantityAfter < 0) {
        throw new BadRequestException('Adjustment would result in negative stock');
      }

      let inventory;
      if (existing) {
        inventory = await tx.inventory.update({
          where: { inventoryId: existing.inventoryId },
          data: { quantity: quantityAfter },
        });
      } else {
        inventory = await tx.inventory.create({
          data: {
            productId: dto.productId,
            branchId: dto.branchId,
            quantity: quantityAfter,
          },
        });
      }

      await tx.inventoryMovement.create({
        data: {
          productId: dto.productId,
          branchId: dto.branchId,
          movementType: MovementType.ADJUSTMENT,
          quantityChange: dto.quantityChange,
          quantityBefore,
          quantityAfter,
          recordedBy: userId,
          note: dto.note,
        },
      });

      return inventory;
    }).then(async (inventory) => {
      await this.checkAndNotifyStock(dto.productId, dto.branchId);
      return inventory;
    });
  }

  async getMovements(branchId: number, productId: number) {
    return this.prisma.inventoryMovement.findMany({
      where: { branchId, productId },
      orderBy: { createdAt: 'desc' },
      include: {
        product: { select: { productName: true, sku: true } },
        recorder: { select: { fullName: true, username: true } },
      },
    });
  }
}