import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateSupplierDto } from './dto/create-supplier.dto';
import { UpdateSupplierDto } from './dto/update-supplier.dto';

@Injectable()
export class SuppliersService {
  constructor(private readonly prisma: PrismaService) {}

  private async getUserBusinessId(userId: number): Promise<number | null> {
    const user = await this.prisma.user.findUnique({
      where: { userId },
      select: {
        role: { select: { roleName: true } },
        branch: { select: { businessId: true } },
      },
    });
    if (!user) throw new NotFoundException('User not found');
    return user.branch?.businessId ?? null;
  }

  private async isBusinessAdmin(userId: number): Promise<boolean> {
    const user = await this.prisma.user.findUnique({
      where: { userId },
      select: { role: { select: { roleName: true } } },
    });
    return user?.role?.roleName === 'BUSINESS_ADMIN';
  }

  async create(dto: CreateSupplierDto, userId: number) {
    const businessId = await this.getUserBusinessId(userId);
    if (await this.isBusinessAdmin(userId) && !businessId) {
      throw new ForbiddenException('Your account is not linked to a business');
    }

    const existing = await this.prisma.supplier.findFirst({
      where: {
        supplierName: dto.supplierName,
        isActive: true,
        ...(businessId ? { businessId } : {}),
      },
    });
    if (existing) {
      throw new ConflictException('A supplier with this name already exists');
    }

    return this.prisma.supplier.create({
      data: {
        ...dto,
        ...(businessId ? { businessId } : {}),
      },
    });
  }

  async findAll(includeInactive = false, userId: number) {
    const businessId = await this.getUserBusinessId(userId);
    const where: any = {};
    if (!includeInactive) where.isActive = true;
    if (await this.isBusinessAdmin(userId)) {
      if (!businessId) throw new ForbiddenException('Your account is not linked to a business');
      where.businessId = businessId;
    }

    return this.prisma.supplier.findMany({ where });
  }

  async findOne(id: number, userId: number) {
    const businessId = await this.getUserBusinessId(userId);
    const where: any = { supplierId: id };
    if (await this.isBusinessAdmin(userId)) {
      if (!businessId) throw new ForbiddenException('Your account is not linked to a business');
      where.businessId = businessId;
    }

    const supplier = await this.prisma.supplier.findFirst({ where });
    if (!supplier) throw new NotFoundException('Supplier not found');
    return supplier;
  }

  async update(id: number, dto: UpdateSupplierDto, userId: number) {
    await this.findOne(id, userId);
    const businessId = await this.getUserBusinessId(userId);

    if (dto.supplierName) {
      const conflict = await this.prisma.supplier.findFirst({
        where: {
          supplierName: dto.supplierName,
          isActive: true,
          supplierId: { not: id },
          ...(businessId ? { businessId } : {}),
        },
      });
      if (conflict) {
        throw new ConflictException('Another active supplier already uses this name');
      }
    }

    return this.prisma.supplier.update({
      where: { supplierId: id },
      data: dto,
    });
  }

  async remove(id: number, userId: number) {
    await this.findOne(id, userId);

    const productCount = await this.prisma.product.count({
      where: { supplierId: id, status: 'active' },
    });

    if (productCount > 0) {
      return this.prisma.supplier.update({
        where: { supplierId: id },
        data: { isActive: false },
      });
    }

    return this.prisma.supplier.delete({ where: { supplierId: id } });
  }
}