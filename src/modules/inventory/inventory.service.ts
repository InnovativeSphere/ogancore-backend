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
import { MovementType } from '@prisma/client';

@Injectable()
export class InventoryService {
  constructor(private readonly prisma: PrismaService) {}

  // ─── View inventory for a branch ─────────────────────
  async viewBranchInventory(branchId: number) {
    const branch = await this.prisma.branch.findUnique({
      where: { branchId },
    });
    if (!branch) throw new NotFoundException('Branch not found');

    return this.prisma.inventory.findMany({
      where: { branchId },
      include: { product: true },
    });
  }

  // ─── Stock In (receipt) ──────────────────────────────
  async stockIn(userId: number, dto: StockInDto) {
    return this.prisma.$transaction(async (tx) => {
      const product = await tx.product.findUnique({
        where: { productId: dto.productId },
      });
      if (!product) throw new BadRequestException('Product not found');

      const branch = await tx.branch.findUnique({
        where: { branchId: dto.branchId },
      });
      if (!branch) throw new BadRequestException('Branch not found');

      // Get current stock (0 if none)
      const existing = await tx.inventory.findUnique({
        where: {
          productId_branchId: {
            productId: dto.productId,
            branchId: dto.branchId,
          },
        },
      });
      const quantityBefore = existing ? existing.quantity : 0;
      const quantityAfter = quantityBefore + dto.quantity;

      // Update or create inventory row
      const inventory = await tx.inventory.upsert({
        where: {
          productId_branchId: {
            productId: dto.productId,
            branchId: dto.branchId,
          },
        },
        create: {
          productId: dto.productId,
          branchId: dto.branchId,
          quantity: quantityAfter,
        },
        update: {
          quantity: quantityAfter,
        },
      });

      // Log movement
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

  // ─── Stock Out (issue/damage) ────────────────────────
  async stockOut(userId: number, dto: StockOutDto) {
    return this.prisma.$transaction(async (tx) => {
      const product = await tx.product.findUnique({
        where: { productId: dto.productId },
      });
      if (!product) throw new BadRequestException('Product not found');

      const branch = await tx.branch.findUnique({
        where: { branchId: dto.branchId },
      });
      if (!branch) throw new BadRequestException('Branch not found');

      const existing = await tx.inventory.findUnique({
        where: {
          productId_branchId: {
            productId: dto.productId,
            branchId: dto.branchId,
          },
        },
      });
      const quantityBefore = existing ? existing.quantity : 0;
      const quantityAfter = quantityBefore - dto.quantity;

      if (quantityAfter < 0) {
        throw new BadRequestException('Insufficient stock for this operation');
      }

      // If no row existed, create with negative? But we shouldn't if after negative. If quantityAfter >=0 and existing not null, update. If existing null and quantityAfter >=0, then dto.quantity must be <=0? But dto.quantity positive so quantityAfter would be negative if existing is null. So existing must exist. But we still need to handle if existing is null and quantityAfter not negative? Impossible because dto.quantity positive and quantityBefore 0 => after negative. So we can assume existing exists. Use update.
      const inventory = await tx.inventory.update({
        where: { inventoryId: existing!.inventoryId },
        data: { quantity: quantityAfter },
      });

      await tx.inventoryMovement.create({
        data: {
          productId: dto.productId,
          branchId: dto.branchId,
          movementType: MovementType.ADJUSTMENT, // or specific type like DAMAGE? We only have ADJUSTMENT as generic. Later can add enum values.
          quantityChange: -dto.quantity,
          quantityBefore,
          quantityAfter,
          recordedBy: userId,
          note: dto.note,
        },
      });

      return inventory;
    });
  }

  // ─── Transfer between branches ───────────────────────
  async transfer(userId: number, dto: TransferDto) {
    return this.prisma.$transaction(async (tx) => {
      if (dto.fromBranchId === dto.toBranchId) {
        throw new BadRequestException('Source and destination branches must differ');
      }

      const product = await tx.product.findUnique({
        where: { productId: dto.productId },
      });
      if (!product) throw new BadRequestException('Product not found');

      const fromBranch = await tx.branch.findUnique({
        where: { branchId: dto.fromBranchId },
      });
      if (!fromBranch) throw new BadRequestException('Source branch not found');

      const toBranch = await tx.branch.findUnique({
        where: { branchId: dto.toBranchId },
      });
      if (!toBranch) throw new BadRequestException('Destination branch not found');

      // Source inventory
      const sourceInv = await tx.inventory.findUnique({
        where: {
          productId_branchId: {
            productId: dto.productId,
            branchId: dto.fromBranchId,
          },
        },
      });
      if (!sourceInv || sourceInv.quantity < dto.quantity) {
        throw new BadRequestException('Insufficient stock at source branch');
      }
      const sourceBefore = sourceInv.quantity;
      const sourceAfter = sourceBefore - dto.quantity;

      // Destination inventory
      const destInv = await tx.inventory.findUnique({
        where: {
          productId_branchId: {
            productId: dto.productId,
            branchId: dto.toBranchId,
          },
        },
      });
      const destBefore = destInv ? destInv.quantity : 0;
      const destAfter = destBefore + dto.quantity;

      // Update source
      await tx.inventory.update({
        where: { inventoryId: sourceInv.inventoryId },
        data: { quantity: sourceAfter },
      });

      // Upsert destination
      await tx.inventory.upsert({
        where: {
          productId_branchId: {
            productId: dto.productId,
            branchId: dto.toBranchId,
          },
        },
        create: {
          productId: dto.productId,
          branchId: dto.toBranchId,
          quantity: destAfter,
        },
        update: {
          quantity: destAfter,
        },
      });

      // Log both movements
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
    });
  }

  // ─── Manual Adjustment ───────────────────────────────
  async adjust(userId: number, dto: AdjustDto) {
    return this.prisma.$transaction(async (tx) => {
      const product = await tx.product.findUnique({
        where: { productId: dto.productId },
      });
      if (!product) throw new BadRequestException('Product not found');

      const branch = await tx.branch.findUnique({
        where: { branchId: dto.branchId },
      });
      if (!branch) throw new BadRequestException('Branch not found');

      const existing = await tx.inventory.findUnique({
        where: {
          productId_branchId: {
            productId: dto.productId,
            branchId: dto.branchId,
          },
        },
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
    });
  }

  // ─── Movement History ────────────────────────────────
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