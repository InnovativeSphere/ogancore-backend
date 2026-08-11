import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateSupplierDto } from './dto/create-supplier.dto';
import { UpdateSupplierDto } from './dto/update-supplier.dto';

@Injectable()
export class SuppliersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateSupplierDto) {
    const existing = await this.prisma.supplier.findFirst({
      where: { supplierName: dto.supplierName, isActive: true },
    });
    if (existing) {
      throw new ConflictException('A supplier with this name already exists');
    }
    return this.prisma.supplier.create({ data: dto });
  }

  async findAll(includeInactive = false) {
    const where: any = {};
    if (!includeInactive) {
      where.isActive = true;
    }
    return this.prisma.supplier.findMany({ where });
  }

  async findOne(id: number) {
    const supplier = await this.prisma.supplier.findUnique({
      where: { supplierId: id },
    });
    if (!supplier) throw new NotFoundException('Supplier not found');
    return supplier;
  }

  async update(id: number, dto: UpdateSupplierDto) {
    await this.findOne(id);
    if (dto.supplierName) {
      const conflict = await this.prisma.supplier.findFirst({
        where: {
          supplierName: dto.supplierName,
          isActive: true,
          supplierId: { not: id },
        },
      });
      if (conflict) {
        throw new ConflictException('Another active supplier already uses this name');
      }
    }
    return this.prisma.supplier.update({ where: { supplierId: id }, data: dto });
  }

  async remove(id: number) {
    await this.findOne(id);

    // Check if any active products reference this supplier
    const productCount = await this.prisma.product.count({
      where: { supplierId: id, status: 'active' },
    });

    if (productCount > 0) {
      // Soft-delete — products still reference it
      return this.prisma.supplier.update({
        where: { supplierId: id },
        data: { isActive: false },
      });
    }

    // Hard-delete — no dependencies
    return this.prisma.supplier.delete({ where: { supplierId: id } });
  }
}